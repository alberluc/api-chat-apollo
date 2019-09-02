import {
    Arg,
    Authorized,
    Ctx, Field,
    FieldResolver, InputType,
    Mutation,
    PubSub,
    PubSubEngine,
    Query,
    Resolver,
    Root,
    Subscription
} from 'type-graphql'
import {User} from './user.entity'
import {ConnectUserInput} from './user.input'
import {Error} from 'mongoose'
import {Context, Upload} from '../types'
import {IsOwner} from '../decorators'
import {Auth} from '../auth'
import {GraphQLUpload} from 'apollo-server'
import {Stream} from 'stream'
import * as fs from 'fs'

export interface OnUserConnectedPayload {
    user: User
}

export interface OnUserDisconnectedPayload {
    user: User
}

export const SUBSCRIPTION = {
    NEW_CONNECTED_USER: 'NEW_CONNECTED_USER',
    NEW_DISCONNECTED_USER: 'NEW_DISCONNECTED_USER',
}

@Resolver(User)
export class UserResolver {

    @Authorized()
    @IsOwner({
        verify: ({ root, context }) => root._id === context.user._id
    })
    @FieldResolver()
    password(
        @Root() root: User,
        @Ctx() context: Context
    ): string {
        return root.password
    }

    @Authorized()
    @Query(returns => User)
    async getMe(
        @Ctx() context: Context
    ): Promise<User> {
        return context.user
    }

    @Authorized()
    @Query(returns => [User])
    async getUsers(
        @Arg('connected', { nullable: true }) connected?: boolean
    ): Promise<User[]> {
        const query: any = {}
        if (connected !== null) {
            query.countClient = connected ? { $gt: 0 } : 0
        }
        console.log('users', await User.find(query))
        return await User.find(query)
    }

    @Authorized()
    @Mutation(returns => User)
    async uploadAvatarUser(
        @Arg('file', type => GraphQLUpload) file: Upload,
        @Ctx() context: Context
    ) {
        const { user } = context
        const { filename, createReadStream, mimetype } = await file
        const uuid = Math.random().toString().split('.')[1]
        const imageName = `${uuid}_${filename}`
        const readStream = createReadStream()
        const writeStream = fs.createWriteStream(`${__dirname}/../../../uploads/images/${imageName}`)

        await readStream.pipe(writeStream)

        user.avatar = imageName
        return await user.save()
    }

    @Mutation(returns => Auth)
    async connectUser(
        @Arg('input') input: ConnectUserInput,
        @PubSub() pubSub: PubSubEngine
    ): Promise<Auth> {
        const { pseudo, password } = input
        let user = await User.findOne({ pseudo })

        if (user && user.password !== password) {
            throw new Error('Le pseudo existe mais le mot de passe ne correspond pas')
        } else if (!user) {
            user = new User()
            Object.assign(user, input)
            await user.save()
        }

        return Auth.fromUser(user)
    }

    @Authorized()
    @Subscription({
        topics: ({ context }) => Auth.subscribe(context, () => {
            return SUBSCRIPTION.NEW_CONNECTED_USER
        })
    })
    newConnectedUser(@Root() payload: OnUserConnectedPayload): User {
        return payload.user
    }

    @Authorized()
    @Subscription({
        topics: ({ context }) => Auth.subscribe(context, () => {
            return SUBSCRIPTION.NEW_DISCONNECTED_USER
        })
    })
    newDisconnectedUser(@Root() payload: OnUserDisconnectedPayload): User {
        return payload.user
    }
}
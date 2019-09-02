import {
    Arg,
    Authorized,
    Ctx,
    FieldResolver,
    Mutation,
    PubSub,
    PubSubEngine,
    Query,
    Resolver,
    Root,
    Subscription
} from 'type-graphql'
import {Message} from './message.entity'
import {User} from '../user'
import {CreateMessageInput} from './message.input'
import {Context} from '../types'
import {Auth} from '../auth'
import {getMongoRepository} from 'typeorm'

const SUBSCRIPTION = {
    NEW_MESSAGE: 'NEW_MESSAGE'
}

interface NewMessagePayload {
    message: Message
}

@Resolver(Message)
export class MessageResolver {

    @FieldResolver(returns => User)
    async author(
        @Root() message: Message
    ): Promise<User> {
        return await User.findOne(message.author.toString())
    }

    @Authorized()
    @Mutation(returns => Message)
    async createMessage(
        @Arg('input') input: CreateMessageInput,
        @Ctx() context: Context,
        @PubSub() pubSub: PubSubEngine
    ) {
        const message = new Message()
        Object.assign(message, {
            ...input,
            author: context.user._id
        })

        await message.save()
        await pubSub.publish(SUBSCRIPTION.NEW_MESSAGE, { message })

        return message
    }

    @Authorized()
    @Query(returns => [Message])
    async getMessages(): Promise<Message[]> {
        const messageRepo = getMongoRepository(Message)
        return await messageRepo.find()
    }

    @Authorized()
    @Subscription({
        topics: ({ context }) => Auth.subscribe(context, () => {
            return SUBSCRIPTION.NEW_MESSAGE
        })
    })
    newMessage(@Root() payload: NewMessagePayload): Message {
        return payload.message
    }
}
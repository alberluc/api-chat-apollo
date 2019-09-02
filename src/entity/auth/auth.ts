import {BaseEntity} from 'typeorm'
import {AuthChecker, createMethodDecorator, Field, ObjectType} from 'type-graphql'
import {User} from '../user'
import * as jwt from 'jsonwebtoken'
import {Request} from 'express'
import {Context} from '../types'

@ObjectType()
export class Auth {

    static subscribe(context: Context, callback: () => string): string {
        if (!Auth.check(context)) {
            throw new Error('Unauthorized user cannot receive info from this socket')
        }
        return callback()
    }

    static check(context: Context, roles: string[] = []): boolean {
        return !!context.user
    }

    static fromUser(user: User): Auth {
        const payload = { userId: user._id }
        const token = jwt.sign(payload, 'secret')

        return new Auth(token, user)
    }

    static async getUser(token: string): Promise<User> {
        let decoded = null
        try {
            decoded = await jwt.verify(token, 'secret')
        } catch (e) {
            return null
        }
        return await User.findOne((<any>decoded).userId)
    }

    static async authenticate(req: Request): Promise<User> {
        const authorization = req.header('Authorization')
        if (!authorization) return null

        const token = authorization.replace('Bearer ', '')
        return await Auth.getUser(token)
    }

    @Field()
    token: string

    @Field()
    user: User

    constructor(token: string, user: User) {
        this.token = token
        this.user = user
    }
}
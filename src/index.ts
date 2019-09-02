import 'reflect-metadata'
import {ArgumentValidationError, AuthChecker, buildSchema, PubSubEngine} from 'type-graphql'

import * as mongoose from 'mongoose'
import {ConnectionContext} from 'subscriptions-transport-ws'
import * as WebSocket from 'ws'
import {createConnection, getMongoManager} from 'typeorm'
import {MongoConnectionOptions} from 'typeorm/driver/mongodb/MongoConnectionOptions'
import {User, UserResolver} from './entity/user'
import {MessageResolver} from './entity/message'
import {Context} from './entity/types'
import {Auth} from './entity/auth'
import * as express from 'express'
import {ApolloServer, gql, PubSub} from 'apollo-server-express'
import * as http from 'http'
import {ValidationError} from 'class-validator'
import {SUBSCRIPTION} from './entity/user/user.resolver'

const setup = async () => {

    await createConnection({
        type: 'mongodb',
        url: 'mongodb://localhost:27017/chat',
        port: 27017,
        name: 'default',
        useNewUrlParser: true,
        host: 'localhost',
        logging: true,
        entities: [__dirname + '/**/*.entity.ts']
    })

    const manager = getMongoManager()
    await manager.updateMany(
        User,
        { countClient: { $gt: 0 } },
        { $set: { countClient: 0 } }
    )

    const customAuthChecker: AuthChecker<Context> = ({ context }, roles): boolean => {
        return Auth.check(context, roles)
    }

    const pubSub = new PubSub()
    const schema = await buildSchema({
        resolvers: [__dirname + '/**/*.resolver.ts'],
        authChecker: customAuthChecker,
        pubSub: pubSub
    })

    const server = new ApolloServer({
        schema,
        // @ts-ignore
        context: async ({ req, connection }) => {
            if (connection) {
                return connection.context
            }
            return { user: await Auth.authenticate(req) }
        },
        uploads:{
            maxFiles: 10
        },
        formatError: error => {
            if (error.originalError instanceof ArgumentValidationError) {
                error.extensions.code = 'ARGUMENT_VALIDATION_ERROR'
            }
            return error
        },
        subscriptions: {
            onConnect: async ({ token }: { token: string }, websocket: WebSocket, context: ConnectionContext) => {
                const user = await Auth.getUser(token)
                if (user) {
                    user.countClient++
                    console.log('client++', user.pseudo, user.countClient)
                    if (user.countClient === 1) {
                        await pubSub.publish(SUBSCRIPTION.NEW_CONNECTED_USER, { user })
                    }
                    await user.save()
                }
                return { user }
            },
            onDisconnect: async (websocket: WebSocket, context: ConnectionContext) => {
                const { user } = await context.initPromise
                if (user) {
                    user.countClient--
                    console.log('client--', user.pseudo, user.countClient)
                    if (!user.countClient) {
                        await pubSub.publish(SUBSCRIPTION.NEW_DISCONNECTED_USER, { user })
                    }
                    await user.save()
                }
            }
        }
    })

    const app = express()
    app.use('/uploads', express.static(`${__dirname}/uploads`))

    server.applyMiddleware({ app })

    const httpServer = http.createServer(app)
    server.installSubscriptionHandlers(httpServer)

    httpServer.listen({ port: 4000 }, () => {
        console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
        console.log(`Subscriptions ready at ws://localhost:4000${server.subscriptionsPath}`)
    })
}

setup().catch(err => console.log(err))
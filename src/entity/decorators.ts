import {Context} from './types'
import {createMethodDecorator, MiddlewareFn, ResolverData} from 'type-graphql'

export function IsOwner({ verify }: { verify: (action: ResolverData<Context>) => boolean }) {
    return createMethodDecorator( (action, next) => {
        if (!verify(action)) {
            throw Error('Unauthorized, you are not the owner of this resource')
        }
        return next()
    });
}
import {Authorized, Field, InputType} from 'type-graphql'
import {User} from './user.entity'
import {Length} from 'class-validator'

/**
 * Connect Input class
 */
@InputType()
export class ConnectUserInput implements Partial<User> {

    @Length(3, 60, {
        message: 'Le pseudo doit contenir entre 3 et 60 caractères'
    })
    @Field()
    pseudo: string

    @Length(3, 200, {
        message: 'Le mot de passe doit contenir entre 3 et 200 caractères'
    })
    @Field()
    password: string
}
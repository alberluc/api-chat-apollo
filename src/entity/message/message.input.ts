import {Field, InputType} from 'type-graphql'
import {Length} from 'class-validator'

@InputType()
export class CreateMessageInput {

    @Length(3, 200,{
        message: 'Le contenu du message doit contenir entre 3 et 200 caractères'
    })
    @Field()
    content: string
}
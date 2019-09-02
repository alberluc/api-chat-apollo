import {Field, ID, ObjectType} from 'type-graphql'
import {User} from '../user/user.entity'
import {BaseEntity, Column, Entity, ObjectIdColumn} from 'typeorm'
import {Schema, Types} from 'mongoose'

@ObjectType()
@Entity()
export class Message extends BaseEntity {

    @Field(type => ID)
    @ObjectIdColumn()
    _id: string

    @Field(type => User)
    @Column()
    author: User | Types.ObjectId

    @Field()
    @Column()
    content: string
}
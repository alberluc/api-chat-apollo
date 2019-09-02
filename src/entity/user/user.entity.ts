import {Field, ID, ObjectType} from 'type-graphql'
import {BaseEntity, Column, Entity, ObjectIdColumn} from 'typeorm'
import { Types } from 'mongoose'

@ObjectType()
@Entity()
export class User extends BaseEntity {

    @Field(type => ID)
    @ObjectIdColumn()
    _id: Types.ObjectId

    @Field()
    @Column()
    pseudo: string

    @Field()
    @Column()
    password: string

    @Field({ nullable: true })
    avatar: string = null

    @Field()
    @Column()
    countClient: number = 0
}
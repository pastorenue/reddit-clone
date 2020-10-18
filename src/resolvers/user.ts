import { Resolver, Ctx, Arg, Mutation, Field, InputType, ObjectType, Query } from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from 'argon2'

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType()
class FieldError {
    @Field()
    field: string

    @Field()
    message: string
}

@ObjectType()
class UserResponse {
    @Field(() => User, {nullable: true})
    user?: User

    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[]
}


@Resolver()
export class UserResolver {
   
    @Mutation(() => UserResponse)
    async register(@Arg('options') options: UsernamePasswordInput, @Ctx() { em }: MyContext): Promise<UserResponse> {
        /*
        This might be too expensive on the database
        const existingUser = await em.findOne(User, {username: options.username});
        if (existingUser) {
            return {
                errors: [{
                    field: "username",
                    message: "Username already exists"
                }]
            }
        }*/

        if (options.username.length <= 2) {
            return {
                errors: [{
                    field: "username",
                    message: "length must be greater than 2"
                }]
            }
        }
        // validate password regular expression  to check
        // between 6 to 20 characters which contain at least one numeric digit, 
        // one uppercase and one lowercase letter
        const validate =  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
        if (!options.password.match(validate)) {
            return {
                errors: [{
                    field: "password",
                    message: "password is too weak"
                }]
            }
        }
        const hashedPassword = argon2.hash(options.password); 
        const user = em.create(User, {username: options.username, password: hashedPassword});
        try {
            await em.persistAndFlush(user)
            return {user,}; 
        } catch (err) {
            // console.error(err);
            if (err.code === "23505") {
                return {
                    errors: [{
                        field: "username",
                        message: "username already exists"
                    }]
                }
            }
        }
        
    }

    @Mutation(() => UserResponse)
    async login(@Arg('options') options: UsernamePasswordInput, @Ctx() { em, req }: MyContext): Promise<UserResponse> {
        const user = await em.findOne(User, {username: options.username})
        if (!user) {
            return {
                errors: [{
                    field: "username",
                    message: "Username doesn't exist"
                }]
            }
        }
        const valid = argon2.verify(user.password, options.password); 
        if (!valid) {
            return {
                errors: [{
                    field: "password",
                    message: "Incorrect Password"
                }]
            }
        }

        req.session.sessionId = user.id;
        return {
            user,
        };
    }

    @Query(() => User, {nullable: true}) 
    async me(
        @Ctx() { req, em }: MyContext
    ) {
        if (!req.session.sessionId) {
            // user not logged in
            return null;
        }
        const user = await em.findOne(User, {id: req.session.sessionId})
        return user;
    }
}
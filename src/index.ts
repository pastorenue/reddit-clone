import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import microConfig from "./mikro-orm.config";
// import express from 'express';


const main = async () => {
    const orm = await MikroORM.init(microConfig);

    // Run the migrations
    await orm.getMigrator().up();

    //Create the ORM object
    //const post = orm.em.create(Post, {title: 'My first post'});
    
    // Hit the database now
    //await orm.em.persistAndFlush(post);
    const posts = await orm.em.find(Post, {});
    console.log(posts);

};


main().catch((err) => {
    console.error(err);
});
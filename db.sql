create table users (
username varchar(255) primary key,
    password varchar(255) not null
);

create table posts (
    username varchar(255) not null references users(username),
    content text not null,
    id serial primary key,
    "timestamp" text not null,
    retweet integer references posts(id)
);

create table comments (
    username varchar(255) not null references users(username),
    id serial primary key,
    content text not null,
    parent integer not null,
    post integer not null references posts(id)
);

create table followers (
    username varchar(255) not null references users(username),
    follows varchar not null references users(username)
);

create table images (
    username varchar(255) not null references users(username),
    img text
);

create table shares (
    username varchar(255) not null references users(username),
    post integer not null references posts(id),
    "timestamp" text not null
);


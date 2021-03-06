const path = require('path');
const bcrypt = require('bcrypt');
const express = require('express');
const parser = require('body-parser');
const session = require('express-session')

const config = require('./config.js');
const {
    Comment,
    Follower,
    Image,
    ImageTag,
    Tag,
    User,
} = require('./models/association.js');

const app = express();
const root = process.cwd();

app.use(session({
    cookie: {
        maxAge:   7 * 24 * 60 * 60 * 1000,
        path:     '/',
        httpOnly: true,
        sameSite: 'lax',
        secure:   false,
    },
    name:              'sessionId',
    secret:            config.session.secret,
    saveUninitialized: false,
    resave:            false,
    unset:             'destroy',
    rolling:           false,
    proxy:             false,
}));

app.use(function (req, res, next) {
    if (req.session.user) {
        res.locals.user = req.session.user;
    }
    next();
})

app.set('view engine', 'pug');
app.set('views', path.join(root, '/static/pug'));
app.use(express.static(path.join(root, '/static')));
app.use(parser.urlencoded( { extended: true } ));
app.use(parser.json());

app.get('/', async (req, res) => {
    const image = await Image.findAll({
        attributes: [
            'content',
            'category',
            'likes',
            'views',
        ],
    });
    res.render('index', {
        title: '首頁',
        image
    });
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/image', (req, res) => {
    res.render('image', {
        title: '圖片',
    });
});

app.get('/profile/:user', (req, res) => {
    User.findOne({
        where: {
            userId: req.params.user
        },
    })
    .then(user => {
        res.render('profile', {
            title: `${ user.username }的頁面`,
        });
    })
    .catch(error => {
        res.status(500).send({ error });
    });
});

app.get('/signup', (req, res) => {
    if(req.session.user){
        res.redirect(`/profile/${ req.session.username }`);
    }
    else {
        res.render('signup', {
            title: '會員註冊',
        });
    }
});

app.post('/signup', async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    User.create({
        username: req.body.username,
        email: req.body.email,
        password: hash,
        birthday: new Date(`${ req.body.birthyear }-${ req.body.birthmonth }-${ req.body.birthdate }`),
    })
    .then(() => {
        res.redirect('/signin');
    })
    .catch(err => {
        console.log(err.errors)
        if(err.errors[0].type === 'unique violation'){
            // TODO: frontend error message display
            res.redirect('/signup');
        }
        else{
            res.status(500).send('Server side error occured');
        }
    });
});

app.get('/signin', (req, res) => {
    if(req.session.user){
        res.redirect(`/profile/${ req.session.username }`);
    }
    else {
        res.render('signin', {
            title: '會員登入',
        });
    }
});

app.post('/signin', async (req, res) => {
    const user = await User.findOne({
        where: {
            email: req.body.email
        },
        attributes: [
            'userId',
            'username',
            'password'
        ],
    });
    bcrypt.compare(req.body.password, user.password)
    .then(matched => {
        if(matched){
            req.session.user = {
                id: user.userId,
                name: user.username,
            }
            res.redirect(`/profile/${ user.userId }`);
        }
        else {
            // TODO: frontend error message display
            res.redirect('signin');
        }
    });
});

app.listen(config.port, () => {
    console.log(`Listen on ${ config.port }`);
});

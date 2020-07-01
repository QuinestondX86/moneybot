require('dotenv').config({
  path: '../.env'
})

const
  Telegraf = require('telegraf'),
  LocalSession = require('telegraf-session-local'),
  Markup = require('telegraf/markup')

const property = 'data'
const bot = new Telegraf(process.env.BOT_TOKEN)

const price = {
  x2: 10_000,
  x3: 30_000
}

const localSession = new LocalSession({
  database: process.env.BOT_SESSION,
  property: 'session',
  storage: LocalSession.storageFileAsync,
  format: {
    serialize: (obj) => JSON.stringify(obj, null, 2),
    deserialize: (str) => JSON.parse(str),
  }
})

bot.use(localSession.middleware(property))

bot.help((ctx) => {
  return ctx.reply('Money', Markup
    .keyboard([
      ['/my 🏦', '/all 🤑', '/start 💰', '/shop 🛍️'],
    ])
    .oneTime()
    .resize()
    .extra()
  )
})

bot.start((ctx, next) => {
  return ctx.reply('+', Markup
    .keyboard([
      ['Add 💰'], ['/my 🏦'], ['/all 🤑']
    ])
    .oneTime(false)
    .resize()
    .extra()
  )
})

bot.on('text', async (ctx, next) => {
  if(ctx.message.text === 'Add 💰') {
    ctx[property].counter = ctx[property].counter || 0
    ctx[property].counter++
    ctx[property].username = ctx.from.username || ctx.from.id
  }

  return await next()
})

bot.command('/my', (ctx) => {
  ctx.replyWithMarkdown(`@${ctx.from.username || ctx.from.id} have \`${ctx[property].counter}\`💰`)
})

bot.command('/all', (ctx) => {
  const usersData = ctx[property + 'DB'].get('sessions').value()
  let all = ''

  usersData.map((user) => {
    all += `@${user.data.username} have \`${user.data.counter}\`💰\n`
  })

  ctx.replyWithMarkdown(all)
})

bot.command('/shop', (ctx) => {
  return ctx.reply('+', Markup
    .keyboard([
      ['/shop/x2️22️ ✖️2️2️2️'], ['/shop/x3 ✖️']
    ])
    .oneTime(false)
    .resize()
    .extra()
  )
})

bot.startPolling()


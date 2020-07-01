require('dotenv').config({
  path: '../.env'
})

const
  Telegraf = require('telegraf'),
  TelegrafContext = require('telegraf/context'),
  LocalSession = require('telegraf-session-local'),
  Markup = require('telegraf/markup'),
  property = 'data',
  bot = new Telegraf(process.env.BOT_TOKEN)

const price = {
  1: 10_000,
  2: 30_000
}

let sessionId = ''

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
      ['/my 🏦', '/all 🤑', '/start 💰'],
      ['/shop 🛍️', '/s 🏎️']
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
    let accelerators = ctx[property].accelerator.split(',')

    if(accelerators) {
      accelerators.forEach(function(item, index, array) {
        switch (item) {
          case "x3":
            ctx[property].counter += 3
            break
          case "x2":
            ctx[property].counter += 2
            break
        }
      })
    } else {
      ctx[property].counter++
      ctx[property].username = ctx.from.username || ctx.from.id
    }
  }

  return await next()
})

bot.command('/s', ((ctx, next) => {
  setInterval(() => {
    console.log(ctx[property].counter)
    ctx[property].counter = ctx[property].counter || 0
    let accelerators = ctx[property].accelerator.split(',')

    if(accelerators) {
      accelerators.forEach(function(item, index, array) {
        switch (item) {
          case "x3":
            ctx[property].counter += 3
            break
          case "x2":
            ctx[property].counter += 2
            break
        }
      })
    } else {
      ctx[property].counter++
      ctx[property].username = ctx.from.username || ctx.from.id
    }
  }, 1000)
}))

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
  let buttons = []
  for (key in price) {
    if (ctx[property].accelerator.indexOf('x' + key)) {
      buttons.push('/buy' + key)
    }
  }

  return ctx.reply('+', Markup
    .keyboard([
      buttons
    ])
    .oneTime(false)
    .resize()
    .extra()
  )
})

bot.hears(/\/buy\d+/, (ctx) => {
  let reg = ctx.message.text
  let acceleratorId = Number(reg.match(/\d+/g))
  const newPrice = Number(ctx[property].counter) - price[acceleratorId]

  if(Number(ctx[property].counter) >= price[acceleratorId++]) {
    ctx[property].accelerator = ctx[property].accelerator ? ctx[property].accelerator + ',x' +  acceleratorId++ : 'x' + acceleratorId++
    ctx[property].counter = newPrice

    ctx.reply('Accelerator bought successfully!✔️')
  } else {
    ctx.reply('Accelerator bought failed(hasn\'t money)!❌️')
  }
})

bot.startPolling()


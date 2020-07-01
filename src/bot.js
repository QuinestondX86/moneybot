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
const priceTime = {
  500: 40_000,
  250: 100_000
}

let backgroundAcceleratorRunning = false

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
  console.log(Number(ctx[property].acceleratorTime))
  if(backgroundAcceleratorRunning === false) {
    backgroundAcceleratorRunning = true
    ctx.reply("You run accelerator!🏎️")
    setInterval(() => {
      console.log("User: " + ctx[property].username + " have " + ctx[property].counter)
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
    }, Number(ctx[property].acceleratorTime) || 1000)
  }
}))

bot.command('/my', (ctx) => {
  ctx.replyWithMarkdown(`@${ctx.from.username || ctx.from.id} have \`${ctx[property].counter.toLocaleString({style: 'currency', currency: 'US'})}\`💰`)
})

bot.command('/all', (ctx) => {
  const usersData = ctx[property + 'DB'].get('sessions').value()
  let all = ''

  usersData.map((user) => {
    all += `@${user.data.username} have \`${user.data.counter.toLocaleString({style: 'currency', currency: 'US'})}\`💰\n`
  })

  ctx.replyWithMarkdown(all)
})

bot.command('/shop', (ctx) => {
  let buttons = []
  let buttonsTime= []

  for (key in price) {
    if (ctx[property].accelerator.indexOf('x' + key)) {
      let acceleratorSpeed = Number(key) + 1
      buttons.push('/buy' + key + ' (x' + acceleratorSpeed + ') 🏎️')
    }
  }

  for (key in priceTime) {
    // if (ctx[property].acceleratorTime.indexOf(key)) {
    buttonsTime.push('/buyt' + key + ' (' + key + 'ms) ⏱️')
    // }
    console.log(priceTime)
  }

  return ctx.reply('+', Markup
    .keyboard([
      buttons,
      buttonsTime
    ])
    .oneTime(false)
    .resize()
    .extra()
  )
})

bot.hears(/\/buy\d+/, (ctx) => {
  let reg = ctx.message.text
  let acceleratorIdString = reg.match(/\/buy\d+/g)[0]
  let acceleratorId = acceleratorIdString.match(/\d+/g)
  const newPrice = Number(ctx[property].counter) - price[acceleratorId]
  const whatX = Number(acceleratorId) + 1

  if(Number(ctx[property].counter) >= Number(price[acceleratorId])) {
    ctx[property].accelerator = ctx[property].accelerator ? ctx[property].accelerator + ',x' +  + whatX : 'x' + whatX
    ctx[property].counter = newPrice

    console.log("User: " + ctx[property].username + " - bought accelerator with id" + acceleratorId)

    ctx.reply('Accelerator bought successfully!✔️')
  } else {
    ctx.reply('Accelerator bought failed(hasn\'t money)!❌️')
  }
})

bot.hears(/\/buyt\d+/, (ctx) => {
  let reg = ctx.message.text
  let acceleratorIdString = reg.match(/\/buyt\d+/g)[0]
  let acceleratorId = acceleratorIdString.match(/\d+/g)
  const newPrice = Number(ctx[property].counter) - priceTime[acceleratorId]

  console.log(Number(ctx[property].counter))
  console.log(Number(priceTime[acceleratorId]))

  if(Number(ctx[property].counter) >= Number(priceTime[acceleratorId])) {
    ctx[property].acceleratorTime = ctx[property].acceleratorTime ? ctx[property].acceleratorTime + ',' +  acceleratorId : acceleratorId
    ctx[property].counter = newPrice

    console.log("User: " + ctx[property].username + " - bought time accelerator with id" + acceleratorId)

    ctx.reply('Time accelerator bought successfully!✔️')
  } else {
    ctx.reply('Time accelerator bought failed(hasn\'t money)!❌️')
  }
})

bot.startPolling()


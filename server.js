const net = require('net')

var players = []
var gameState = 0
var playerResCount = 0
var tableTop = null
var passTurn = 0

net.createServer((socket) => {

    if(gameState >= 1)
    {
        socket.destroy()
        return
    }

    socket.on('data', (data) => {
        var msg = data.toString()
        var player = findPlayer(socket.remoteAddress, socket.remotePort)

        if(msg == 'play')
        {
            console.log(`${player.name}(${player.addr}:${player.port}) chose to play again.`)
            player['state'] = 1
            socket.write('ok')
            console.log('!!!')
            return;
        }

        if(gameState == 0)
        {
            if(msg == 'hello' && player == null)
            {
                players.push({
                    addr: socket.remoteAddress,
                    port: socket.remotePort,
                    name: `${socket.remoteAddress}:${socket.remotePort}`,
                    state: 0,
                    client: socket
                })
                socket.write('hello')
                socket.read()
                console.log(`${socket.remoteAddress}:${socket.remotePort} joined.`)
                return
            }

            if(player.state == 0)   // wait for key
            {
                player['name'] = msg
                player['state'] = 1
                socket.write('ok')
                console.log(`${player.addr}:${player.port} has set nickname to ${msg}.`)
                return
            }

            if(player.state == 1 && msg == 'ready')     // ready
            {
                player['state'] = 2
                console.log(`${player.name}(${player.addr}:${player.port}) is ready.`)
                if(getReadyPlayer() == players.length && players.length >= 2 && players.length <= 8)
                {
                    console.log('All players are ready.')
                    gameState = 1
                    player['state'] = 3
                    announce('start')
                }
                else if(players.length > 8)
                {
                    while(players.length > 8)
                    {
                        var kickPlayer = players.splice(8, 1)
                        kickPlayer.client.destroy()
                    }
                }
                return
            }   
        }
        else if(gameState == 1)
        {
            if(msg == 'settle')
            {
                getResponse(function(){
                    gameState = 2
                    socket.emit('playGameSettle')
                })
                return;
            }
        }
        else if(gameState == 2)
        {
            var name = `${player.name}(${player.addr}:${player.port})`

            if(msg == '') return;

            if(msg == 'win')
            {
                console.log('We have the winner.')
                announce(JSON.stringify({
                    cmd: 'announce', msg: `${name} won the game.\n\n\n\n\n\n\n`
                }));
                setTimeout(function(){
                    announce(JSON.stringify({
                        cmd: 'reset'
                    }))
                    gameState = 0
                    playerResCount = 0
                    tableTop = null
                    passTurn = 0
                }, 3000)
                return;
            }

            if(msg == 'gotten')
            {
                getResponse(function(){
                    players[0].client.write(JSON.stringify({
                        cmd: 'turn',
                        top: tableTop
                    }))
                    var tmp = players.splice(0, 1)[0]
                    players.push(tmp)
                })
                return
            }
            
            if(msg == 'pass')
            {
                console.log(`${name} has passed.`)
                announce(JSON.stringify({
                    cmd: 'announce', msg: `${name} has passed.`
                }));
                if(++passTurn >= players.length)
                {
                    console.log(`All players have passed their turn.\nClear the Table`);
                    tableTop = null
                    setTimeout(function(){
                        players[players.length-1].client.write(JSON.stringify({
                            cmd: 'turn',
                            top: tableTop
                        }))
                        passTurn = 0
                    }, 500)
                }
                else
                {
                    setTimeout(function(){
                        players[0].client.write(JSON.stringify({
                            cmd: 'turn',
                            top: tableTop
                        }))
                        var tmp = players.splice(0, 1)[0]
                        players.push(tmp)
                    }, 500)                    
                }
                return
            }
            
            passTurn = 0
            console.log(`${name} has placed ${msg}.`)
            announce(JSON.stringify({
                cmd: 'announce', msg: `${name} has placed ${getCardFullName(msg)}.`
            }));
            tableTop = msg
            setTimeout(function(){
                players[0].client.write(JSON.stringify({
                    cmd: 'turn',
                    top: tableTop
                }))
                var tmp = players.splice(0, 1)[0]
                players.push(tmp)
            }, 500)
        }
    })

    socket.on('playGameSettle', function(){
        shufflePlayerOrder()
        var cards = shuffleCardForPlayers()
        for(var i in players)
        {
            players[i].client.write(JSON.stringify({
                cards: cards[i],
                role: parseInt(i)+1,
                joker: 1
            }))
        }
    })

    socket.on('close', function(){
        console.log(`${socket.remoteAddress}:${socket.remotePort} disconnected.`)
        var i = 0
        while(i < players.length)
        {
            if(players[i].client == socket || players[i].client.destroyed)
            {
                players.splice(i--, 1)
            }
            i++
        }
        if(gameState >= 1)
        {
            gameState = 0
            playerResCount = 0
            tableTop = null
            passTurn = 0
            announce(JSON.stringify({
                cmd: 'announce', msg: `disconnected`
            }));
            while(i < players.length)
            {
                player[i++].state = 1
            }
        }
    })

    socket.on('error', function(err){
        
    })

}).listen(8080, '127.0.0.1')
console.log('Server listening on 127.0.0.1:8080')

function findPlayer(addr, port)
{
    for(var player of players)
    {
        if(player['addr'] == addr && player['port'] == port) return player
    }
    return null
}

function getReadyPlayer()
{
    var num = 0
    for(var player of players)
    {
        if(player['state'] == 2) num += 1
    }
    return num
}

function announce(msg)
{
    for(var player of players)
    {
        player.client.write(msg)
    }
}

function random(max)
{
    return Math.floor(Math.random()*max)
}

function shufflePlayerOrder()
{
    var arr = []
    while(players.length > 0)
    {
        var player = players.splice(random(players.length), 1)[0]
        arr.push(player)
    }
    players = arr
}

function shuffleCardForPlayers()
{
    var pileCard = ['1c','1d','1h','1s','2c','2d','2h','2s','3c','3d','3h','3s','4c','4d','4h','4s',
    '5c','5d','5h','5s','6c','6d','6h','6s','7c','7d','7h','7s','8c','8d','8h','8s','9c','9d','9h','9s',
    '10c','10d','10h','10s','11c','11d','11h','11s','12c','12d','12h','12s','13c','13d','13h','13s'
    ]
    var playingCards = []
    for(var i in players) playingCards.push([])
    while(pileCard.length > 0)
    {
        for(var i in players)
        {
            if(pileCard.length <= 0) break
            var card = pileCard.splice(random(pileCard.length), 1)[0]
            playingCards[i].push(card)
        }
    }
    return playingCards
}

function getResponse(callback)
{
    playerResCount += 1
    if(playerResCount == players.length)
    {
        if(callback && typeof callback == "function"){
            callback()
        }
        playerResCount = 0
    }
}

function getCardName(card)
{
    var cardName = card.replaceAll('13','K').replaceAll('12','Q').replaceAll('11','J').replaceAll('1','A').replaceAll('A0','10')
    return cardName.replaceAll('s', '♠').replaceAll('h', '♥').replaceAll('c', '♣').replaceAll('d', '♦').replaceAll('00','JOKER')
}

function getCardFullName(card)
{
    var cardName = card.replaceAll('13', 'King of ').replaceAll('12', 'Queen of ').replaceAll('11', 'Jack of ').replaceAll('10', 'Ten of ')
    cardName = cardName.replaceAll('1', 'Ace of ').replaceAll('2', 'Two of ').replaceAll('3', 'Three of ')
    cardName = cardName.replaceAll('4', 'Four of ').replaceAll('5', 'Five of ').replaceAll('6', 'Six of ')
    cardName = cardName.replaceAll('7', 'Seven of ').replaceAll('8', 'Eight of ').replaceAll('9', 'Nine of ')
    if(cardName.charAt(cardName.length-1) == 's') cardName = cardName.substring(0, cardName.length-1) + 'Spade'
    else if(cardName.charAt(cardName.length-1) == 'h') cardName = cardName.substring(0, cardName.length-1) + 'Heart'
    else if(cardName.charAt(cardName.length-1) == 'd') cardName = cardName.substring(0, cardName.length-1) + 'Diamond'
    else if(cardName.charAt(cardName.length-1) == 'c') cardName = cardName.substring(0, cardName.length-1) + 'Club'
    else cardName = 'Joker Card'

    return `${cardName} (${getCardName(card)})`
}
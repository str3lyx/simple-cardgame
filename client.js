const { Socket } = require('dgram')
const net = require('net')
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

var state = 0
var cards = null
var joker = 0
var name = ''

client = new net.Socket()
client.connect(8080, '127.0.0.1', function(){
    client.write('hello')
})

client.on('data', (data) => {
    var msg = data.toString()

    if(state == 0 && msg == 'hello')    // idle
    {
        state = 1
        client.emit('inputKey')
        return;
    }

    if(state == 1 && msg == 'ok')       // input key
    {
        state = 2
        client.emit('playerReady')
        return
    }

    if(state == 2 && msg == 'start')    // all are ready
    {
        client.write('settle')
        state = 3
        return
    }

    if(state == 3)                      // settle
    {
        var obj = JSON.parse(msg)
        if(obj['cmd'] == 'announce')
        {
            if(obj['msg'] == 'disconnected')
            {
                console.log('Game ends due to some player disconnected.')
                client.destroy()
            }
            else console.log(obj['msg'])
            client.write('')
            return
        }
        console.log('Your card...')
        cards = obj['cards'].sort(compareFunction)
        joker = obj['joker']
        printCardName()
        console.log(`You got Turn #${obj['role']}`)
        client.write('gotten')
        state = 4
        return
    }

    if(state = 4)
    {
        var obj = JSON.parse(msg)
        if(obj['cmd'] == 'turn')
        {
            client.emit('playerTurn', obj['top'], '')
        }
        else if(obj['cmd'] == 'announce')
        {
            if(obj['msg'] == 'disconnected')
            {
                console.log('Game ends due to some player disconnected.')
                client.destroy()
            }
            else console.log(obj['msg'])
            client.write('')
        }
        else if(obj['cmd'] == 'reset')
        {
            state = 1
            cards = null
            joker = 0
            client.emit('playerReplay')
        }
        return;
    }
})

client.on('playerReplay', function(){
    readline.question(`${name}, do you want to play again? (Y/n): `, (ans) => {
        if(ans.toLowerCase() != 'n' && ans.toLowerCase() != 'no')
        {
            client.write('play')
            return
        }
        client.destroy()
    })
})

client.on('playerTurn', function(top, err){
    console.log('--------------------------------------')
    console.log('Your Turn')
    printCardName()
    printTableTop(top)
    if(hasValidCard(top))
    {
        if(err != '') console.log(err)
        readline.question(`Pick your card (or press 9 to pass your turn)\n> `, choice => {

            if(state != 4) return;

            if(choice == '9')
            {
                client.write('pass')
                return;
            }

            var index = isValidCharacter(choice)
            if(index >= 0)
            {
                if(isValidCard(cards[index], top))
                {
                    var card = cards.splice(index, 1)[0]
                    if(cards.length <= 0 && joker <= 0) client.write('win')
                    else client.write(card)
                    return;
                }
                else client.emit('playerTurn', top, `${getCardName(cards[index])}'s honer is lower than ${getCardName(top)}'s.`)
            }
            else if(index == -1)
            {
                joker -= 1
                if(cards.length <= 0 && joker <= 0) client.write('win')
                else client.write('00')
                return;
            }
            else if(index == -2) client.emit('playerTurn', top, 'Invalid Character: Out of range')
            else if(index == -3) client.emit('playerTurn', top, 'Invalid Character: No Joker Card')
        })
    }
    else
    {
        if(joker > 0)
        {
            console.log(`You have the ${getCardFullName('00')}.`)
            readline.question(`Would you like to use it? (Y/n)\n> `, ans => {
                if(ans.toLowerCase() != 'n' && ans.toLowerCase() != 'no')
                {
                    joker -= 1
                    if(cards.length <= 0 && joker <= 0) client.write('win')
                    else client.write('00')
                    return
                }
                client.write('pass')
            })
        }
        else client.write('pass')
    }
})

client.on('playerReady', function(){
    readline.question(`${name}, are you ready? (y/N): `, (ans) => {
        if(ans.toLowerCase() == 'y' || ans.toLowerCase() == 'yes')
        {
            client.write('ready')
            return
        }
        client.emit('playerReady')
    })
})

client.on('inputKey', function(){
    readline.question('Enter name: ', (ans) => {
        client.write(ans)
        name = ans
    })
})

client.on('close', function(){
    console.log('Server terminated')
    readline.close()
})

client.on('error', function(err){

})

// --------------------------------------------------------------------------------------------- //

function printCardName()
{
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var str = '', i = 0, k=0
    for(var j=0; j<cards.length; j++)
    {
        ++i;
        var cardName = getCardName(cards[j])
        str = str + `${alphabet.charAt(k++)}. ${cardName.length==2 ? ' ' + cardName : cardName} ${i<6 ? '    ' : ''}`
        if(i >= 6)
        {
            console.log(str)
            i = 0
            str = ''
        }
    }
    if(str != '') console.log(str)
    if(joker > 0) console.log('0. ' + getCardName('00'))
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

function printTableTop(top)
{
    if(top == null)
    {
        console.log('You can choose any card.')
    }
    else
    {
        console.log(`Table Top is ${getCardFullName(top)}.`)
        if(top == '00') console.log('You can choose any card.')
    }
}

function isValidCharacter(ch)
{
    ch = ch.toLowerCase()
    var index = ch.charCodeAt(0) - 'a'.charCodeAt(0)
    if(ch == '0')
    {
        if(joker > 0) return -1
        else return -3
    }

    if(index >= cards.length || index < 0 || ch == '') return -2
    return index;
}

function isValidCard(card, top)
{
    if(top == '00' || compareFunction(card,top) > 0 || card == '00' || top == null) return true
    return false
}

function hasValidCard(top)
{
    for(var card of cards)
        if(isValidCard(card, top)) return true
    return false
}

function compareFunction(a,b)
{
    if(a == null && b == null) return 0
    if(b == null) return 1
    if(a == null) return -1

    var numA = parseInt(a.substring(0, a.length-1)); var charA = a.substring(a.length-1);
    var numB = parseInt(b.substring(0, b.length-1)); var charB = b.substring(b.length-1);

    if(numA == numB)
    {
        return charA.charCodeAt(0) - charB.charCodeAt(0)
    }
    return numA - numB
}
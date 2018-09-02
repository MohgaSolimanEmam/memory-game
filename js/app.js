"use strict"; 

/* Architecture Overview
- EventListener creates listener and calls EventHandler
- EventHandler handles event by calling internal models (ScorePanel, Deck).
- Internal models will modify based on events and call ViewChanger to modify view
- ViewChanger changes DOM HTML
Advantage:
- View is decoupled from model 
    - when I change HTML&CSS (likely to change), that change is only propagated to EventListener and ViewChanger
- Easier to test in isolation. 
    - does ViewChanger change HTML? 
    - does EventListener create listener and call appropriate EventHandler?
    - Do internal models work the way we expect without worrying about events, and views
*/


/*
 *
 */
const ScorePanel = {
    move : 0,
    time : 0,
    star : 3,
    incrementTime : () => {
        ScorePanel.time += 1;
        ViewChanger.setTime(ScorePanel.time);
    },
    incrementMove : () => {
        ScorePanel.move += 1;
        ViewChanger.setMoves(ScorePanel.move);

        if (ScorePanel.move === 30) {         
            ScorePanel.star = 2;
            ViewChanger.setStars(2);
        } else if (ScorePanel.move === 40) {
            ScorePanel.star = 1;
            ViewChanger.setStars(1);
        } else {
            // do nothing. stars don't change
        }
    },
    reset : () => {
        ScorePanel.move = 0;
        ScorePanel.star = 3;
        ScorePanel.time = 0;
        ViewChanger.setMoves(0);
        ViewChanger.setStars(3);
        ViewChanger.setTime(0);
    }
}
Object.seal(ScorePanel);


/* Timer global variable is declared and will later have interval function of
 * ScorePanel.incrementTime() attached when user clicks start and the interval function
 * will be stopped when all cards are matched or player presses restart.
 */
let Timer;


/* represents card's symbol (enum). In order to represent enum, it should be used with Object.freeze() to
 * prevent any modification. Symbol enum's value is CSS class that represent each symbol in view. 
 * Therefore, if our view changes, we have to change Symbol enum accordingly
 */
const Symbol = {
    ANCHOR : 'fa fa-anchor',
    BICYCLE : 'fa fa-bicycle',
    BOLT : 'fa fa-bolt',
    BOMB : 'fa fa-bomb',
    CUBE : 'fa fa-cube',
    DIAMOND : 'fa fa-diamond',
    LEAF : 'fa fa-leaf',
    PLANE : 'fa fa-paper-plane-o',    
}
// we don't want our Symbol enum to change during runtime.
Object.freeze(Symbol);


/* represents card's state (enum). In order to represent enum, it should be used with Object.freeze() to
 * prevent any modification. State enum's value is CSS class that represent each state in view. 
 * Therefore, if our view changes, we have to change Symbol enum accordingly
 */
const State = {
    CLOSED : 'card',
    OPENED : 'card open show',
    MATCHED : 'card open match',
}
// we don't want our State enum to change during runtime
Object.freeze(State);


const Deck = {
    cards : [Symbol.ANCHOR, Symbol.ANCHOR, Symbol.BICYCLE, Symbol.BICYCLE,
    Symbol.BOLT, Symbol.BOLT, Symbol.BOMB, Symbol.BOMB, Symbol.CUBE, Symbol.CUBE,
    Symbol.DIAMOND, Symbol.DIAMOND, Symbol.LEAF, Symbol.LEAF, Symbol.PLANE, Symbol.PLANE],
    opened : [],
    matched : [],
    shuffle : (array) => {
        // Algorithm adapted from https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm 
        for (let i = array.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        ViewChanger.setCardsSymbols(array);
    },
    reset : () => {
        Deck.opened.length = 0;
        Deck.matched.length = 0;
        for (let i = 0; i < Deck.cards.length; i++) {
            ViewChanger.closeCard(i);
        }
        Deck.shuffle(Deck.cards);
    },
    tryOpeningCard : ({index, symbol}) => {
        Deck.opened.push({index,symbol})
        ViewChanger.openCard(index);
        
        if (Deck.opened.length === 2) { window.setTimeout(Deck.checkMatch, 200); } 
                       
    },
    checkMatch : () => {
        const c0 = Deck.opened[0];
        const c1 = Deck.opened[1];

        if (c0.symbol !== c1.symbol ) {
            ViewChanger.closeCard(c0.index);
            ViewChanger.closeCard(c1.index);
            Deck.opened.length = 0;
        } else {
            ViewChanger.matchCard(c0.index);
             ViewChanger.matchCard(c1.index);            
            Deck.matched.push(c0, c1);
            Deck.opened.length = 0;
        }

        if (Deck.matched.length === Deck.cards.length) {
            // win condition
            console.log("you win");
            clearInterval(Timer);
            ViewChanger.hideStartButton(false);
        }

    },
}
Object.freeze(Deck);
Object.seal(Deck.cards)


/* ViewChanger is a layer between model and view so all changes in DOM has be in ViewChanger class
 * ViewChanger is dependent on our Symbol and State enum's value.
 * both ViewChanger and EventListener accesses view, we need to make sure they don't interfere.
 */
class ViewChanger {
    static setStars(numStars) {
        const d = document.getElementsByClassName("stars")[0];
        const starHTML = '<li><i class="fa fa-star"></i></li>';
        d.innerHTML = starHTML.repeat(numStars); 
    }

    static setMoves(numMoves) {
        const d = document.getElementsByClassName("moves")[0];
        d.innerHTML = numMoves;}
    static setTime(seconds) {
        const d = document.getElementsByClassName("timer")[0];
        d.innerHTML = seconds;
    }

    static openCard(cardIndex) {
        const d = document.getElementsByClassName("card");
        d[cardIndex].setAttribute("class", State.OPENED);
    }

    static closeCard(cardIndex) {
        const d = document.getElementsByClassName("card");
        d[cardIndex].setAttribute("class", State.CLOSED);
    }

    static matchCard(cardIndex) {
        const d = document.getElementsByClassName("card");
        d[cardIndex].setAttribute("class", State.MATCHED);
    }

    static setCardsSymbols(cards) {
        const d = document.getElementsByClassName("card");
        for (let i = 0; i < cards.length; i++) {
            d[i].firstChild.setAttribute("class", cards[i]);
        }
    }

    static hideStartButton(bool) {
        const d = document.getElementsByClassName("modal")[0];
        if (bool === true) {
            d.innerHTML = `Ready to Play? <br><br>
            3 stars &lt; 30 moves <br>
            2 stars &lt; 40 moves <br>
            1 star  &gt;= 40 moves<br><br> 
            Click to Play`;
            d.className = "modal hide";
        } else {
            d.innerHTML = `Congratulation! <br><br> Total Time Taken: ${ScorePanel.time} <br> Star Rating: ${ScorePanel.star} <br> Total Moves: ${ScorePanel.move}  <br><br> Click to Restart`;
            d.className = "modal show";
        }
    }

}

/* has methods for each possible user's actions. Each method will attach event listener to user's view
 * if our view changes, we have to make sure to change this! 
 * both ViewChanger and EventListener accesses view, we need to make sure they don't interfere.
 */
class EventListener {
    static setClickStart() {
        const d = document.getElementsByClassName('modal')[0];
        d.addEventListener("click", EventHandler.clickStart);
    }

    static setClickRestart() {
        const d = document.getElementsByClassName('restart')[0];
        d.addEventListener("click", EventHandler.clickRestart);
    }

    static setClickCards() {
        
        // why attach event listener on every card? attach one listener to parent and use event delegation
        // inspired from https://davidwalsh.name/event-delegate
        const d = document.getElementsByClassName("deck")[0];
        
        // We will call event handler when the card is closed
        d.addEventListener("click", (e) => {
            const state = e.target.className;
            console.log(state);
            if (state === State.CLOSED) {
                EventHandler.clickCard(e);
            }
        });
    }
}

/* has a event handler methods for each possible user's action. 
 */
class EventHandler {
    static clickCard(e) {
        const index = e.target.id;
        const state = e.target.className;
        const symbol = e.target.firstChild.className;

        ScorePanel.incrementMove();
        Deck.tryOpeningCard({index, symbol});
        
    }
    static clickRestart() {
        Deck.reset();
        ScorePanel.reset();
    }
    static clickStart(e) {
        Deck.reset();
        ScorePanel.reset();
        Timer = setInterval(ScorePanel.incrementTime, 1000);
        ViewChanger.hideStartButton(true);

    }
}

function main() {
    EventListener.setClickStart();
    EventListener.setClickRestart();
    EventListener.setClickCards();

}

main();
/*
 * set up the event listener for a card. If a card is clicked:
 *  - display the card's symbol (put this functionality in another function that you call from this one)
 *  - add the card to a *list* of "open" cards (put this functionality in another function that you call from this one)
 *  - if the list already has another card, check to see if the two cards match
 *    + if the cards do match, lock the cards in the open position (put this functionality in another function that you call from this one)
 *    + if the cards do not match, remove the cards from the list and hide the card's symbol (put this functionality in another function that you call from this one)
 *    + increment the move counter and display it on the page (put this functionality in another function that you call from this one)
 *    + if all cards have matched, display a message with the final score (put this functionality in another function that you call from this one)
 */
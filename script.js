/* Components (parent(child(childofchild))):
score-sheet
sheet-upper
    sheet-row: contains the schore sheet rows for upper categories
sheet-lower
    sheet-row: contains the score sheet rows for lower categories and info field
roll-and-dice:
roll-button: contains the methods to randomize dice values and update score sheet rows with potential points
dice-el: contains the die objects for locking

Flow:
* Possible events:
* Roll
    * Increases roll amount
    * Randomizes each die value
    * Stores a sorted array (sDice[]) with dice values
    * Updates row points
    * Iterates all rows where isSet == false and runs rows' calc().
* Set Points
    * Commits the potential row points to actual row points
    * Resets the dice to 0
    * Resets the rolls to 0
* LockAdie
    * Locks a die to not get rolled and blinks it for transition

* Store: 
* Contained objects
    * rolls
    * Amount of rolls made
    * showDice, showScoreModal, showRulesModal
    * Boolean for corresponding components' visibility
    * info
    * Info text that updates depending on what's going on
    * howTo
    * showRulesModal object
    * Row arrays
    * calc() is points calculation function for each row/category
    * potentialPoints is potential points before a category is set/chosen
    * points is the points after it's set
    * par is the category's average value or a relatively good score (e. g. three of an upper cateogry, 17+ Chans, etc)
    * Dice[]
    * Value and whether each die is locked
    * sDice[]
    * Dice[], but sorted ascending, used in row calc()
    * showScoreModal
    * To toggle the "game over"-modal's visibility.

Reflektioner:
* calc() för par hade kanske varit bättre som en for-loop som kollar sDice[i] == sDice[i-1]; i--.

* Onödigt att iterera genom alla isSet == false vid varje roll.
* Hade kunnat prioritera "exkluderande" calcs() först. Något i stil med..
    * If stege, calc() för liten/stor stege, chans, ettor-sexor.
    * If !stege, calc() för par, tvåpar, tretal, chans, ettor-sexor
        * If tvåpar, calc() tvåpar, tretal, kåk, chans, ettor-sexor
        * If tretal && !tvåpar, calc() fyrtal, chans, yatzy, ettor-sexor
            * O. s. v.
* Ställer dock till problem om man vill utöka med fler kategorier jämfört med nuvarande lösning, som är mer dynamisk.

* Klantigt att göra category och points på samma component med sheet-row då det är svårare att lägga till funktionalitet med flera spelare. Hade hellre gjort en component för category och sen skapat upp points v-for:"antalSpelare"

* Borde kanske ha delat upp "specialraderna" (övre total, bonus, till bonus, nedre total, totala total) till en component. Som det är nu blir det extra kod som körs för att de ska återställas ordentligt. 

* Ogillar lösningen med två funktioner i <modal @close> för showScore-modal. Det finns säkert en mer elegant lösning för att återställa raderna.
* Dock smidigt att modals modal-mask (i css) döljer hur tabellen hoppar när spelet återställs.

* Rörigt med så många nestade components. 
* Gör det dock enklare med transitions genom att dölja/ta fram element med metoder.
    * Använder "blinking" för att animera tärningarna. De försvinner bråkdelen av en sekund och animeras på DOM enter med Vues <transition>
* Använder inte components särskilt bra för deras dynamiska återanvändning (utom sheet-row). Det borde t. ex. vara samma modal-element och metoder för toggle för både scoreModal och howTo-modal, och istället byta ut innehållet. Hade dock svårt att få scoreModal att fungera rätt och komma fram när det var slut på kategorier.

* Key events blev tillagda sent. Som resultat känns det lite krystat implementerat, men fungerar. Förutom om man trycker på en tärning innan man rollat, och sen trycker på space. Då är tärningen "vald" i browsern och jag gissar att den får en @click från space, som även skickar roll event.

* Kategoriernas blinking efter roll hamnar i osynk efter roll #2 eftersom de blir tilldelade klassen 

* Använder simplegrid.io för css-grid. container -> row -> col- 1-12.

* Det går att tilldela poäng och låsa kategori utan att slå tärningarna. Hade kunnat åtgärda genom if(rolls > 0), men låter det vara som det är. Kanske dumt, men man borde ju kunna stå över en runda om man vill? 

* Blandar engelska and Swedish in the dokumentation i koden.
* Och ingen wordwrap i dokumentationen heller. Jösses.

*/

/* -----------Components----------- */

const modal = Vue.component("modal", {
  props: [""],
  data() {
    return {
      show: true
    };
  },
  template: `
        <transition name="modal">
        <div class="modal-mask" v-show="show">
            <div class="modal-wrapper modal">
            <div class="modal-container">

                <div class="modal-header">
                <slot name="header">
                    default header
                </slot>
                </div>

                <div class="modal-body">
                <slot name="body">
                    default body
                </slot>
                </div>

                <div class="modal-footer">
                <slot name="footer">
                    Yatzy party
                    <button class="modal-default-button button" @click="$emit('close')">
                    Close
                    </button>
                </slot>
                </div>
            </div>
            </div>
        </div>
        </transition>
        `,
  methods: {
    toggleShow: function() {
      this.show = !this.show;
    }
  }
});

//Container för rollknapp och tärningar
const rollAndDice = Vue.component("roll-and-dice", {
  props: ["rolls", "dice", "show"],
  template: `
        <div class="container center">
        <roll-button :rolls="rolls" 
            class="col-6">
        </roll-button>
        <transition name="shake">
            <div v-show="show">
            <dice-el
                v-for="die, index in dice"
                :dice="dice[index]"
                :key="index"
                class="container">
            </dice-el>
            </div>
        </transition>
        </div>
        `
});

//Rollknapp
const rollButton = Vue.component("roll-button", {
  props: ["rolls"],
  template: `
        <div class="center roll-button">
            <button class="button col-6" v-show="rolls < 3" @click="rollDice">Slå! {{rolls}} / 3</button>
            <button class="button locked col-6" v-show="rolls > 2">Välj kategori</button>
        </div>
        `,
  methods: {
    rollDice: function() {
      store.commit("rollDice");
    }
  }
});

//Tärningar
const diceElement = Vue.component("dice-el", {
  props: ["dice", "locked"],
  template: `
        <span class="col-2">
        <transition>
            <button 
            @click="$store.commit('lockADie', dice)"
            :class="[{locked: locked}, dice]"
            class="button"
            v-if="dice.show">
            {{dice.value}}
            </button>
        </transition>
        </span>
        `,
  methods: {
    lockDice: function(die) {
      store.commit("lockADie", die);
    }
  }
});

//Kategorirad
const sheetRow = Vue.component("sheet-row", {
  template: `
        <div>
        <slot name="category"></slot>
        <slot name="points"></slot>
        </div>
    `
});

//Övre kategorierna (eller vänster kategori i denna app)
const upperSheet = Vue.component("sheet-upper", {
  props: ["uprow"],
  data() {
      return {
        firstAnimation: true
      }
  },
  template: `
        <div>
        <transition>
            <div v-show="uprow.isSet">
            <sheet-row class="row assigned">
                <p class="col-6" slot="category">{{uprow.category}}</p>
                <p class="col-6" slot="points">{{uprow.points}}</p>
            </sheet-row>
            </div>
        </transition>

        <div v-show="!uprow.isSet" @click="setPoints(uprow)">
            <sheet-row class="row unassigned" v-bind:class="classObject">
                <p class="col-6" slot="category" v-bind:class="classObject">{{uprow.category}}</p>
                <p class="col-6" slot="points" v-bind:class="classObject">{{uprow.potentialPoints}}</p>
            </sheet-row>
        </div>
        </div>
        `,
  //Tilldelar poäng vid klick
  methods: {
    setPoints: function(row) {
      store.commit("setPoints", row);
    }
  },
  //Blinkning i kategori
  computed: {
    classObject() {
        this.firstAnimation = !this.firstAnimation;
      if (this.firstAnimation) {
        if (this.uprow.potentialPoints >= this.uprow.par) {
            return "abovepar";
        } else if (this.uprow.potentialPoints > 0) {
            return "abovezero";
        }
    } else if (!this.firstAnimation) { 
        if (this.uprow.potentialPoints >= this.uprow.par) {
            return "abovepartwo";
        } else if (this.uprow.potentialPoints > 0) {
            return "abovezerotwo";
        }
    }
      return "";
    }
  }
});

//Nedre kategorierna (eller, högra kategorier i denna app)
const lowerSheet = Vue.component("sheet-lower", {
  props: ["lowrow"],
  data() {
    return {
      firstAnimation: true
    }
},
  template: `
        <div>
        <transition>
            <div v-show="lowrow.isSet">
                <sheet-row class="row assigned">
                <p class="col-6" slot="category">{{lowrow.category}}</p>
                <p class="col-6" slot="points">{{lowrow.points}}</p>
                </sheet-row>
            </div>
        </transition>

        <div v-show="!lowrow.isSet" @click="setPoints(lowrow)">
            <sheet-row class="row unassigned" v-bind:class="classObject">
            <p class="col-6" slot="category" v-bind:class="classObject"> {{lowrow.category}}</p>
            <p class="col-6" slot="points" v-bind:class="classObject">{{lowrow.potentialPoints}}</p>
            </sheet-row>
        </div>
        </div>
        `,
  methods: {
    //Tilldelar poäng vid klick
    setPoints: function(row) {
      store.commit("setPoints", row);
    }
  },
  computed: {
    //Tilldelar klass för blinkning i kategori
    classObject() {
        this.firstAnimation = !this.firstAnimation;
      if (this.firstAnimation) {
        if (this.lowrow.potentialPoints >= this.lowrow.par) {
            return "abovepar";
        } else if (this.lowrow.potentialPoints > 0) {
            return "abovezero";
        }
    } else if (!this.firstAnimation) { 
        if (this.lowrow.potentialPoints >= this.lowrow.par) {
            return "abovepartwo";
        } else if (this.lowrow.potentialPoints > 0) {
            return "abovezerotwo";
        }
    }
      return "";
    }
  }
});

//Parent till uprow och lowrow, och grandparent till sheet-row.
const scoreSheet = Vue.component("score-sheet", {
  props: ["uprow", "lowrow"],
  template: `
        <div class="container scoresheet">
        <div class="row mainsheet">
            <div class="col-6">
            <sheet-upper 
                v-for="uprow, category in uprow" 
                :uprow="uprow" 
                :key="category"> 
            </sheet-upper>
            <br>
            </div>
            <div class="col-6">
            <sheet-lower 
                v-for="lowrow, index in lowrow" 
                :lowrow="lowrow" 
                :key="index">
            </sheet-lower> 
            </div> 
        </div> 
        </div>
    `
});

/* ----------Vuex---------- */

const store = new Vuex.Store({
  state: {
    rolls: 0,
    showDice: true,
    showScoreModal: false,
    showRulesModal: false,
    dice: [
      { value: 0, locked: false, show: true },
      { value: 0, locked: false, show: true },
      { value: 0, locked: false, show: true },
      { value: 0, locked: false, show: true },
      { value: 0, locked: false, show: true }
    ],
    sDice: [],
    info: {
      currentInfo:
        "Yatzy! Tryck på slå (eller mellanslag) för att slå tärningarna.",
      rollInfo: "Klicka på slå (eller mellanslag) för att slå tärningarna.",
      lockDieInfo:
        "Klicka på tärningar (eller tangenter 1-5) för att låsa, eller en rad för poäng.",
      assignInfo: "Klicka på en rad för poäng."
    },
    howTo: {
      header: "Hur du spelar",
      text:
        "Målet är att på tre slag få tärningarna att matcha med reglerna för kategorierna. Klicka på 'Slå!' (eller tryck på mellanslag) för att slå tärningarna. Tryck på en tärning (eller tangent 1 till 5) för att låsa den. Tryck på en kategorirad för att tilldela poängen till den kategorin. Kategorier med relativt sett bra poäng blinkar blått."
    },

    /* ---------- Categories for sheet rows ---------- */
    upRowsArray: [
      {
        category: "Ettor", //Namn
        points: 0, //Värdet som sätts när kategorien är tilldelad
        isSet: false, //Om kategorin är tilldelad
        potentialPoints: 0, //Värdet som visas innan kategorin är tilldelad
        par: 3, //Genomsnittlig poäng för kategorin
        calc: function(sDice) {
          //Uträkningen för kategorin
          this.potentialPoints = sDice.filter(die => die == 1).length * 1;
        }
      },
      {
        category: "Tvåor",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 6,
        calc: function(sDice) {
          this.potentialPoints = sDice.filter(die => die == 2).length * 2;
        }
      },
      {
        category: "Treor",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 9,
        calc: function(sDice) {
          this.potentialPoints = sDice.filter(die => die == 3).length * 3;
        }
      },
      {
        category: "Fyror",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 12,
        calc: function(sDice) {
          this.potentialPoints = sDice.filter(die => die == 4).length * 4;
        }
      },
      {
        category: "Femmor",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 15,
        calc: function(sDice) {
          this.potentialPoints = sDice.filter(die => die == 5).length * 5;
        }
      },
      {
        category: "Sexor",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 18,
        calc: function(sDice) {
          this.potentialPoints = sDice.filter(die => die == 6).length * 6;
        }
      },
      {
        category: "Övre total",
        points: 0,
        isSet: true,
        potentialPoints: 0,
        calc: function() {
          this.points = 0;
          for (var i = 0; i < 6; i++) {
            this.points += store.getters.getUpRows[i].points;
          }
        }
      },
      {
        category: "Till bonus",
        points: 63,
        isSet: true,
        potentialPoints: 0,
        calc: function() {
          this.points = 63 - store.getters.getUpRows[6].points;
          if (this.points < 0) {
            this.points = 0;
          }
        }
      },
      {
        category: "Bonus",
        points: 0,
        isSet: true,
        potentialPoints: 0,
        calc: function() {
          if (store.getters.getUpRows[6].points >= 63) {
            this.points = 50;
          }
        }
      }
    ],
    downRowsArray: [
      {
        category: "Par",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 8,
        calc: function(sDice) {
          if (sDice[4] == sDice[3]) {
            this.potentialPoints = sDice[4] * 2;
          } else if (sDice[3] == sDice[2]) {
            this.potentialPoints = sDice[3] * 2;
          } else if (sDice[2] == sDice[1]) {
            this.potentialPoints = sDice[2] * 2;
          } else if (sDice[1] == sDice[0]) {
            this.potentialPoints = sDice[1] * 2;
          }
        }
      },
      {
        category: "Tvåpar",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 14,
        calc: function(sDice) {
          if (
            sDice[4] == sDice[3] &&
            sDice[2] == sDice[1] &&
            sDice[4] != sDice[2]
          ) {
            this.potentialPoints = sDice[4] * 2 + sDice[1] * 2;
          } else if (
            sDice[4] == sDice[3] &&
            sDice[1] == sDice[0] &&
            sDice[4] != sDice[0]
          ) {
            this.potentialPoints = sDice[4] * 2 + sDice[0] * 2;
          } else if (
            sDice[3] == sDice[2] &&
            sDice[1] == sDice[0] &&
            sDice[3] != sDice[0]
          ) {
            this.potentialPoints = sDice[3] * 2 + sDice[0] * 2;
          }
        }
      },
      {
        category: "Tretal",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 12,
        calc: function(sDice) {
          // 3tal innehåller alltid [2] som == [1] || [3].
          // Bedömer först om det potentiellt är ett tretal
          if (sDice[2] == sDice[1] || sDice[2] == sDice[3]) {
            if (sDice[2] == sDice[4]) {
              this.potentialPoints = sDice[2] * 3;
            } else if (sDice[1] == sDice[3]) {
              this.potentialPoints = sDice[2] * 3;
            } else if (sDice[0] == sDice[2]) {
              this.potentialPoints = sDice[2] * 3;
            }
          }
        }
      },
      {
        category: "Fyrtal",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 16,
        calc: function(sDice) {
          // 4tal är AAAA + B eller A + BBBB -> If [1] == [4] || [0] == [3]
          if (sDice[0] == sDice[3] || sDice[1] == sDice[4]) {
            this.potentialPoints = sDice[2] * 4;
          }
        }
      },
      {
        category: "Kåk",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 19,
        calc: function(sDice) {
          //Kåk är AAA + BB eller AA + BBB -> Om AA X BB && (X == A || X == B)
          if (
            sDice[0] == sDice[1] &&
            sDice[3] == sDice[4] &&
            (sDice[2] == sDice[0] || sDice[2] == sDice[4]) &&
            sDice[0] != sDice[4]
          ) {
            this.potentialPoints = sDice.reduce(
              (total, amount) => total + amount
            );
          }
        }
      },
      {
        category: "Liten",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 15,
        calc: function(sDice) {
          if (
            sDice[0] == 1 &&
            sDice[1] == 2 &&
            sDice[2] == 3 &&
            sDice[3] == 4 &&
            sDice[4] == 5
          ) {
            this.potentialPoints = 15;
          }
        }
      },
      {
        category: "Stor",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 20,
        calc: function(sDice) {
          if (
            sDice[0] == 2 &&
            sDice[1] == 3 &&
            sDice[2] == 4 &&
            sDice[3] == 5 &&
            sDice[4] == 6
          ) {
            this.potentialPoints = 20;
          }
        }
      },
      {
        category: "Chans",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 17,
        calc: function(sDice) {
          this.potentialPoints = sDice.reduce(
            (total, amount) => total + amount
          );
        }
      },
      {
        category: "Yatzy",
        points: 0,
        isSet: false,
        potentialPoints: 0,
        par: 50,
        calc: function(sDice) {
          if (sDice[0] == sDice[4]) {
            this.potentialPoints = 50;
          }
        }
      },
      {
        category: "Nedre total",
        points: 0,
        isSet: true,
        potentialPoints: 0,
        calc: function() {
          this.points = 0;
          for (var i = 0; i < 9; i++) {
            this.points += store.getters.getDownRows[i].points;
          }
        }
      },
      {
        category: "Totala total",
        points: 0,
        isSet: true,
        potentialPoints: 0,
        calc: function() {
          //Övre total + Bonus + Nedre total
          this.points =
            store.getters.getDownRows[9].points +
            store.getters.getUpRows[6].points +
            store.getters.getUpRows[8].points;
        }
      }
    ]
  },
  mutations: {
    randomizeDice(state) {
      for (var i = state.dice.length - 1; i >= 0; i--) {
        if (!state.dice[i].locked) {
          state.dice[i].value = Math.floor(1 + Math.random() * 6);
        }
      }
    },
    rollDice(state) {
      //Döljer+visar tärningar för <transition> -> Slumpar tärningar ->
      // -> rolls++ -> fyller sDice[] -> alla kategorier potentialPoints till 0 ->
      // -> uppdaterar info-fältet.
      store.commit("blinkRollAndDice");
      store.commit("randomizeDice");
      store.commit("addRoll"); //Comment this out to get infinite rolls (for testing)
      store.commit("putAndSortDiceValues");
      store.commit("resetRows");
      if (state.rolls < 3) {
        store.commit("setLockInfo");
      } else store.commit("setAssignInfo");
      store.commit("calculatePotentialPoints");
    },
    resetDice(state) {
      state.rolls = 0;
      for (var i = state.dice.length - 1; i >= 0; i--) {
        state.dice[i].value = 0;
        state.dice[i].locked = false;
      }
    },
    addRoll(state) {
      state.rolls++;
    },
    updateRow(state, row) {
      //Tilldelar poäng till kategorin
      row.isSet = true;
      row.points = row.potentialPoints;
    },
    calculatePotentialPoints: function() {
      //Itererar alla kategorier som inte är tilldelade och kör deras calc().
      for (var i = 0; i < store.getters.getUnsetDowns.length; i++) {
        store.getters.getUnsetDowns[i].calc(store.getters.getsDiceValues);
      }
      for (var i = 0; i < store.getters.getUnsetUps.length; i++) {
        store.getters.getUnsetUps[i].calc(store.getters.getsDiceValues);
      }
    },
    calculateSpecialRows: function() {
      //Itererar "specialkategorierna" som ska kontrolleras även om de är tilldelade
      for (var i = 0; i < store.getters.specialRows.length; i++) {
        store.getters.specialRows[i].calc();
      }
    },
    lockADie(state, die) {
      //Döljer+visar tärningen (för <transition>) och låser tärningen
      if (die.value !== 0) {
        die.show = false;
        die.locked = !die.locked;
        setTimeout(() => {
          die.show = true;
        }, 1);
      }
    },
    putAndSortDiceValues: state => {
      //Fyller sDice och sorterar för calc()
      state.sDice = [];
      for (var i = state.dice.length - 1; i >= 0; i--) {
        state.sDice.push(state.dice[i].value);
      }
      state.sDice.sort();
    },
    setPoints: (state, row) => {
      //Sätter poäng och låser kategori -> tärningar till 0 ->
      // -> kategorier visar 0 -> ändrar infotext -> räknar ut "specialrader" ->
      // -> visar GAME OVER-skärm om inga kategorier kvar
      store.commit("updateRow", row);
      store.commit("resetDice");
      store.commit("resetRows");
      store.commit("setRollInfo");
      store.commit("calculateSpecialRows");
      if (
        store.getters.getUnsetDowns.length == 0 &&
        store.getters.getUnsetUps.length == 0
      ) {
        store.commit("toggleScoreModal");
      }
    },
    resetGame(state) {
      //Återställer alla kategorier till ursprungsläge
      for (var i = 0; i < state.upRowsArray.length; i++) {
        state.upRowsArray[i].points = 0;
        state.upRowsArray[i].isSet = false;
      }
      for (var i = 0; i < state.downRowsArray.length; i++) {
        state.downRowsArray[i].points = 0;
        state.downRowsArray[i].isSet = false;
      }
      for (var i = 0; i < store.getters.specialRows.length; i++) {
        store.getters.specialRows[i].isSet = true;
      }
    },
    resetRows(state) {
      // Sätter alla kategoriers visade poäng till 0 om de inte är satta
      for (var i = 0; i < state.upRowsArray.length; i++) {
        state.upRowsArray[i].potentialPoints = 0;
      }
      for (var i = 0; i < state.downRowsArray.length; i++) {
        state.downRowsArray[i].potentialPoints = 0;
      }
    },
    // Ändrar info till rätt läge
    setRollInfo(state) {
      state.info.currentInfo = state.info.rollInfo;
    },
    setAssignInfo(state) {
      state.info.currentInfo = state.info.assignInfo;
    },
    setLockInfo(state) {
      state.info.currentInfo = state.info.lockDieInfo;
    },
    // Döljer och visar en tärning för att <transition> ska fungera
    blinkRollAndDice(state) {
      state.showDice = false;
      setTimeout(() => {
        state.showDice = true;
      }, 1);
    },
    // GAME OVER-skärmen togglas
    toggleScoreModal(state) {
      state.showScoreModal = !state.showScoreModal;
    },
    // How-to modal
    toggleRulesModal(state) {
      state.showRulesModal = !state.showRulesModal;
    }
  },
  getters: {
    //get s-dice values för calc()
    getsDiceValues: state => {
      return state.sDice;
    },
    getDownRows: state => {
      return state.downRowsArray;
    },
    getUpRows: state => {
      return state.upRowsArray;
    },
    getUnsetDowns: state => {
      //Nedre kategorier som inte är låsta/tilldelade
      return state.downRowsArray.filter(row => row.isSet == false);
    },
    getUnsetUps: state => {
      //Övre kategorier som inte är låsta/tilldelade
      return state.upRowsArray.filter(row => row.isSet == false);
    },
    info: state => {
      //infotexten
      return state.info.currentInfo;
    },
    specialRows: state => {
      //Specialraderna är övre total, till bonus, bonus, nedre total och totala total.
      return [
        store.getters.getUpRows[6],
        store.getters.getUpRows[7],
        store.getters.getUpRows[8],
        store.getters.getDownRows[9],
        store.getters.getDownRows[10]
      ];
    },
    //Hur du spelar-texten eller modal-rutan, beroende på media query
    getHowTo: state => {
      return state.howTo;
    }
  }
});

/* ----------Root App---------- */

const app = new Vue({
  el: "#app",
 
  store,
  computed: {
    upRows() {
      return store.getters.getUpRows;
    },
    lowRows() {
      return store.getters.getDownRows;
    },
    dice() {
      return store.state.dice;
    },
    rolls() {
      return store.state.rolls;
    },
    info() {
      return store.getters.info;
    },
    showDice() {
      return store.state.showDice;
    },
    totalPoints() {
      return store.getters.getDownRows[10].points;
    },
    showScoreModal() {
      return store.state.showScoreModal;
    },
    showRulesModal() {
      return store.state.showRulesModal;
    },
    howTo() {
      return store.getters.getHowTo;
    }
  },
  methods: {
    //Space för roll, 1-5 för tärningar 1, 2, 3, 4, och 5.
    startKeyEventListener() {
      var current = this;
      window.addEventListener("keyup", function(event) {
        if (event.key == " " && store.state.rolls < 3) {
          store.commit("rollDice");
        } else if (event.key === "1") {
          store.commit("lockADie", store.state.dice[0]);
        } else if (event.key === "2") {
          store.commit("lockADie", store.state.dice[1]);
        } else if (event.key === "3") {
          store.commit("lockADie", store.state.dice[2]);
        } else if (event.key === "4") {
          store.commit("lockADie", store.state.dice[3]);
        } else if (event.key === "5") {
          store.commit("lockADie", store.state.dice[4]);
        }
      });
    }
  },
  mounted() {
    //Initierar key event listener.
    this.startKeyEventListener();
  }
});
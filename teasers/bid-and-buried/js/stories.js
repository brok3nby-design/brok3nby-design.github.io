// ---- The Dusty Flats Gazette: story pool + daily paper generator ----
// Add your own stories here (see docs/NEWSPAPER.md). Images go in newspaper/np_<img>.jpg
'use strict';

// kind: 'arch_hint'  — runs when one of TODAY's lockers matches .arch (real info!)
//       'buyer_hint' — announces one of TOMORROW's visiting specialists (.buyer)
//       'legend_hint'— rumor about an unfound legendary (.legend)
//       'flavor'     — town color, no gameplay info
//       'ad'         — small boxed classified
const STORIES = [
  // ---------- archetype hints (one per today's locker, sometimes names the unit) ----------
  { id: 'musician_evicted', kind: 'arch_hint', arch: 'musician',
    headline: 'LOCAL MUSICIAN SKIPS TOWN, GEAR SEIZED',
    body: 'The frontman of a bar band that "almost opened for somebody famous" has vanished owing fourteen months of rent. Staff at the facility say {unit} still hums when trucks roll by. Amps and all, folks.',
    img: 'musician_evicted' },
  { id: 'musician_noise', kind: 'arch_hint', arch: 'musician',
    headline: 'NOISE COMPLAINTS END ABRUPTLY ON THE EAST ROW',
    body: 'After two years of muffled drumming, the east row has gone quiet. Neighbors are relieved. Bidders are curious. The contents of {unit} go under the hammer today.',
    img: 'musician_noise' },
  { id: 'grandma_estate', kind: 'arch_hint', arch: 'grandma',
    headline: 'BELOVED SEAMSTRESS, 94, LEAVES BEHIND A FULL UNIT',
    body: 'Family living out of state has declined to collect. "It smells like lavender in there," said the manager, tearing up slightly. Doilies, china, and who knows what else in {unit}.',
    img: 'grandma_estate' },
  { id: 'grandma_quilts', kind: 'arch_hint', arch: 'grandma',
    headline: 'EVERYTHING WRAPPED IN QUILTS: AN AUCTION MYSTERY',
    body: 'Sources report a unit packed floor to ceiling with hand-wrapped bundles. Grandmothers wrap what matters. Todays bidders find out what mattered in {unit}.',
    img: 'grandma_quilts' },
  { id: 'workshop_retired', kind: 'arch_hint', arch: 'workshop',
    headline: 'RETIRED MACHINIST MOVES TO THE COAST, LEAVES THE LOT',
    body: '"Forty years of tools and not one goodbye," said a former coworker. Oil stains lead all the way to the door of {unit}. Bring a strong back.',
    img: 'workshop_retired' },
  { id: 'workshop_birdhouse', kind: 'arch_hint', arch: 'workshop',
    headline: 'THE HALF-FINISHED BIRDHOUSE OF DUSTY FLATS',
    body: 'It sits just inside a delinquent unit, unfinished since spring. Everything a hobbyist ever bought at full price waits behind it in {unit}.',
    img: 'workshop_birdhouse' },
  { id: 'hoarder_ceiling', kind: 'arch_hint', arch: 'hoarder',
    headline: 'UNIT PACKED "FLOOR TO CEILING," DOOR BARELY CLOSED',
    body: 'Facility staff needed two tries to roll the door down on {unit}. Collectors call it a gamble. Therapists call it something else. Auction is today.',
    img: 'hoarder_ceiling' },
  { id: 'shop_closing', kind: 'arch_hint', arch: 'shopStock',
    headline: 'MAIN STREET SHOP FOLDS; INVENTORY VANISHES INTO STORAGE',
    body: 'The CLOSING SALE signs came down and the stock went somewhere. Price stickers still on the boxes, they say, in {unit}. Retail dreams, wholesale prices.',
    img: 'shop_closing' },
  { id: 'smuggler_lock', kind: 'arch_hint', arch: 'smuggler',
    headline: 'WHO CHANGES A STORAGE LOCK TWICE IN ONE MONTH?',
    body: 'Paid cash. Fake name. Rattles when trucks pass. The manager would say no more about {unit}, and honestly, that says plenty.',
    img: 'smuggler_lock' },
  { id: 'oddball_mannequin', kind: 'arch_hint', arch: 'oddball',
    headline: 'TENANT REQUESTED UNIT "FACING AWAY FROM THE ROAD." IT DOES NOT.',
    body: 'Management honored the request as best it could. The tenant visited {unit} every full moon with a folding chair and left without it. There are, staff estimate, many chairs. And other things. Auction is today.',
    img: 'oddball_mannequin' },
  { id: 'oddball_letters', kind: 'arch_hint', arch: 'oddball',
    headline: 'EVERY BOX IN DELINQUENT UNIT LABELED WITH ONE LETTER; NO TWO THE SAME',
    body: 'Staff who peeked through the gap report cardboard marked K, Q, and what may be a lowercase g. "It\'s a system," said the manager, who refused to say whose. The contents of {unit} go under the hammer today, in whatever order they come.',
    img: 'oddball_letters' },
  // ---------- and a few more owners' stories ----------
  { id: 'shop_florist', kind: 'arch_hint', arch: 'shopStock',
    headline: 'FLORIST CLOSES; COOLER, TILL AND "EVERYTHING BUT THE FLOWERS" STORED',
    body: 'The flowers went to the church. The rest went into {unit}: the counter, the till with its drawer taped shut, and cartons of vases nobody wanted at wholesale. The till, the manager notes, "was heavy for an empty till."',
    img: 'shop_closing' },
  { id: 'smuggler_two_locks', kind: 'arch_hint', arch: 'smuggler',
    headline: 'UNIT HAS TWO LOCKS. FACILITY PUT ON ONE OF THEM.',
    body: 'The other lock on {unit} was there when the tenant left and nobody has the key. The facility cut its own lock for today. The other, the manager says, "is a good lock. Too good. Bring a locksmith. Bring two."',
    img: 'smuggler_lock' },
  { id: 'capsule_christmas', kind: 'arch_hint', arch: 'timeCapsule',
    headline: 'UNIT DECORATED FOR CHRISTMAS SINCE 1989',
    body: 'A tree, still up. Presents, still wrapped. The tenant of {unit} rented it in December and never came back for January. Staff say the wrapping paper "has not faded, because nothing in there has seen light."',
    img: 'capsule_1987' },
  { id: 'office_bank', kind: 'arch_hint', arch: 'officeSurplus',
    headline: 'BRANCH BANK CLOSES; FURNITURE, SIGNAGE AND "ONE SMALL SAFE" GO TO STORAGE',
    body: 'The bank took the money. The bank left everything else in {unit}, including, per the inventory, "safe, small, contents unknown, presumed empty." Presumed. The paper has learned to hear that word.',
    img: 'office_layoffs' },
  { id: 'grandma_sewing', kind: 'arch_hint', arch: 'grandma',
    headline: 'DRESSMAKER TO THREE GENERATIONS LEAVES A UNIT OF "PATTERNS AND THE MACHINE"',
    body: 'The machine, the family says, is the one she used for every wedding dress in the county since 1951. It is in {unit} with the patterns, the good scissors, and "the box she never let anybody open, which is probably buttons."',
    img: 'grandma_estate' },
  { id: 'musician_organ', kind: 'arch_hint', arch: 'musician',
    headline: 'CHURCH ORGANIST QUITS OVER "THE NEW HYMNS," STORES FORTY YEARS OF GEAR',
    body: 'The organ stayed. Everything else, the keyboards, the amps from the youth service, the records, went into {unit} on the day of the vote. The organist has been seen at the yard. She is not bidding. She is watching.',
    img: 'musician_noise' },
  // ---------- a fourth voice for the common owners ----------
  { id: 'hoarder_cats', kind: 'arch_hint', arch: 'hoarder',
    headline: 'UNIT SMELLS OF CATS. NO CATS. STAFF "RELIEVED, MOSTLY."',
    body: 'The tenant of {unit} owned, by the manager\'s count, "some cats" and, by the smell, more. None are inside. What is inside is everything else the tenant owned, in the order it was owned. The good things, the manager notes, are the ones that were owned first.',
    img: 'hoarder_ceiling' },
  { id: 'grandma_piano', kind: 'arch_hint', arch: 'grandma',
    headline: 'THE PIANO DID NOT FIT. EVERYTHING ELSE DID.',
    body: 'The estate men could not get the upright through the door of {unit}, so the piano went to the church and everything smaller went in around where it would have stood. Sheet music, they say. Silver, they think. A lot of lavender.',
    img: 'grandma_estate' },
  { id: 'musician_drums', kind: 'arch_hint', arch: 'musician',
    headline: 'DRUMMER QUITS, LEAVES KIT, BAND LEAVES REST',
    body: 'The kit went into {unit} first, in anger. The amps followed, in resignation. The guitars came last, wrapped in a blanket, "like a body," said the roadie, who wants it known he was not paid for that day.',
    img: 'musician_evicted' },
  { id: 'workshop_lathe', kind: 'arch_hint', arch: 'workshop',
    headline: 'MACHINIST\'S FAMILY STORES "THE GOOD LATHE," CANNOT LIFT IT',
    body: 'The family got the lathe into {unit} with a borrowed engine hoist and a lot of language. Everything else went in around it by hand. The tools, one son said, "are the ones he wouldn\'t let us touch." He touched them.',
    img: 'workshop_retired' },
  // ---------- second and third voices per owner (photos shared with the first) ----------
  { id: 'musician_van', kind: 'arch_hint', arch: 'musician',
    headline: 'BAND VAN REPOSSESSED; CONTENTS "MOSTLY CABLES," SAYS BANK',
    body: 'The bank took the van. The band took the rest to storage and then took a bus. What is left in {unit} is described by one former roadie as "the good amp, the bad amp, and a crate nobody was allowed to open."',
    img: 'musician_noise' },
  { id: 'musician_wedding', kind: 'arch_hint', arch: 'musician',
    headline: 'WEDDING BAND DISBANDS MID-RECEPTION; GEAR LEFT IN LOT',
    body: 'The Sentimentals played their last set on Saturday and had their last argument during it. The equipment went into {unit} Sunday. The bride, reached for comment, said the first dance was "fine, actually."',
    img: 'musician_evicted' },
  { id: 'grandma_church', kind: 'arch_hint', arch: 'grandma',
    headline: 'CHURCH LADIES DIVIDE ESTATE; ONE UNIT "NOBODY WANTED TO OPEN"',
    body: 'The good china went to the daughters. The quilts went to the church. What nobody claimed went into {unit} wrapped in newspaper, which one of the ladies notes "was how Mother kept the real things."',
    img: 'grandma_quilts' },
  { id: 'grandma_lavender', kind: 'arch_hint', arch: 'grandma',
    headline: 'FACILITY ASKS BIDDERS TO STOP SMELLING THE DOORS',
    body: 'Following complaints, staff remind bidders that the lavender coming from {unit} "is not a clue, it is a sachet." Staff then admit that in their experience the lavender units are the ones with the silver.',
    img: 'grandma_estate' },
  { id: 'workshop_widow', kind: 'arch_hint', arch: 'workshop',
    headline: 'WIDOW SELLS THE GARAGE, KEEPS THE TRUCK, STORES "HIS MESS"',
    body: '"Forty years he told me those tools were worth something," she said, locking {unit}. "Somebody prove it." The paper notes that oil stains lead from the door to the back wall and then stop.',
    img: 'workshop_retired' },
  { id: 'workshop_contest', kind: 'arch_hint', arch: 'workshop',
    headline: 'COUNTY FAIR BIRDHOUSE CHAMPION, 1971-1994, GOES DELINQUENT',
    body: 'Twenty-three ribbons and, staff believe, twenty-three birdhouses in {unit}, along with everything a man buys when he has decided he is a craftsman. The tools, they say, are the good kind. The birdhouses are the other kind.',
    img: 'workshop_birdhouse' },
  { id: 'hoarder_paper', kind: 'arch_hint', arch: 'hoarder',
    headline: 'FORTY YEARS OF NEWSPAPERS FOUND IN ONE UNIT; THIS ONE INCLUDED',
    body: 'Staff opening {unit} for inspection found every edition of this paper since 1983, stacked, in order, and something under each stack. "Under each stack," the manager repeated, and would not go on.',
    img: 'hoarder_ceiling' },
  { id: 'hoarder_bags', kind: 'arch_hint', arch: 'hoarder',
    headline: 'UNIT OF "BAGS INSIDE BAGS" GOES UNDER THE HAMMER',
    body: 'The tenant of {unit} was known to put things in bags, and the bags in bags. Staff who looked in describe "a wall of bag." Bidders are advised that people who bag everything bag the good things too.',
    img: 'hoarder_ceiling' },
  { id: 'shop_video', kind: 'arch_hint', arch: 'shopStock',
    headline: 'LAST VIDEO STORE IN THE COUNTY CLOSES; SHELVES GO TO STORAGE',
    body: 'Rewind Rentals rented its final tape on Friday and did not get it back. The rest of the inventory, the counter and the till went into {unit}. Late fees remain outstanding on nine hundred accounts.',
    img: 'shop_closing' },
  { id: 'shop_arcade', kind: 'arch_hint', arch: 'shopStock',
    headline: 'ARCADE OWNER SKIPS TOWN WITH THE QUARTERS, NOT THE CABINETS',
    body: 'The machines from Tilt were rolled into {unit} the night before the landlord changed the locks. "Heavy," said the man who rolled them. "Some of them still lit up." The high scores are, presumably, intact.',
    img: 'shop_closing' },
  { id: 'smuggler_cash', kind: 'arch_hint', arch: 'smuggler',
    headline: 'TENANT PAID THREE YEARS UP FRONT, IN A PAPER BAG, THEN VANISHED',
    body: 'Staff describe the man who rented {unit} as "polite, in a hurry, and wearing two watches." The unit has not been opened since. Something inside it, a night guard says, ticks. Probably one of the watches.',
    img: 'smuggler_lock' },
  { id: 'smuggler_boxes', kind: 'arch_hint', arch: 'smuggler',
    headline: 'EVERY BOX IN UNIT LABELED "BOOKS"; UNIT WEIGHS LIKE IT',
    body: 'The renter of {unit} moved in forty identical boxes marked BOOKS and left. The manager, who has lifted a box of books, says these are not books. He has not said what they are. He has stopped guessing out loud.',
    img: 'smuggler_lock' },
  { id: 'capsule_wedding', kind: 'arch_hint', arch: 'timeCapsule',
    headline: 'BRIDE\'S PARENTS STORED THE WHOLE HOUSE IN 1979; NEVER CAME BACK',
    body: 'The family moved out of state the week after the wedding and rented {unit} "for a year." That was a while ago. The dust inside, staff say, lies flat and undisturbed, "like snow nobody walked on."',
    img: 'capsule_1987' },
  { id: 'capsule_radio', kind: 'arch_hint', arch: 'timeCapsule',
    headline: 'UNIT STILL HAS A WORKING RADIO IN IT, TUNED TO A STATION THAT CLOSED',
    body: 'A night guard heard music from {unit} and found a radio inside, plugged into an outlet that should not be live, tuned to KDST, which went dark in 1988. He unplugged it. It was, he says, playing something good.',
    img: 'capsule_1987' },
  { id: 'office_lawsuit', kind: 'arch_hint', arch: 'officeSurplus',
    headline: 'LAW FIRM DISSOLVES; FILING CABINETS "SPOKEN FOR BY NOBODY"',
    body: 'Pratt, Pratt & Dowd is no more. The partners split the clients and left the furniture, the files and a safe in {unit}. Whatever is in the safe, the paper notes, was not worth a partner\'s time to collect. Or was worth too much to argue over.',
    img: 'office_layoffs' },
  { id: 'office_dental', kind: 'arch_hint', arch: 'officeSurplus',
    headline: 'DENTIST RETIRES, STORES THE WAITING ROOM',
    body: 'Chairs, magazines from 1994, a fish tank without the fish, and "the good equipment, the stuff that plugs in" went into {unit} when Dr. Amsel closed. The fish, staff want it known, were rehomed.',
    img: 'office_folded' },
  { id: 'oddball_cage', kind: 'arch_hint', arch: 'oddball',
    headline: 'TENANT REQUESTED A UNIT "WITH NO WINDOWS." NONE OF THEM HAVE WINDOWS.',
    body: 'The request was granted anyway. Staff who have been near the door describe a smell "like a pet store, but a specific one." The unit goes under the hammer today. Bidders are asked to bring gloves, for no reason management will name.',
    img: 'oddball_mannequin' },
  { id: 'oddball_hum', kind: 'arch_hint', arch: 'oddball',
    headline: 'UNIT HUMS. FACILITY CHECKED THE WIRING. WIRING IS FINE.',
    body: 'The hum from {unit} is audible from the office on still nights. An electrician found nothing plugged in. "It\'s coming from a box," he said. "The box is not plugged in either." He did not bill for the visit.',
    img: 'oddball_letters' },
  { id: 'capsule_1987', kind: 'arch_hint', arch: 'timeCapsule',
    headline: 'UNTOUCHED SINCE 1987: A UNIT FROZEN IN TIME',
    body: 'The calendar on the wall inside still says October. Dust lies thick and even, like snow. Todays bidders on {unit} buy a slice of another decade.',
    img: 'capsule_1987' },

  // ---------- tomorrow's buyers ----------
  // the appraiser's notice rides the same slot (docs/APPRAISAL.md §4): she buys nothing, so it is a date, not a sales pitch
  { id: 'appraiser_table', kind: 'buyer_hint', buyer: 'appraiser',
    headline: 'CERTIFIED APPRAISER AT THE YARD TOMORROW; "BRING IT. DON\'T DESCRIBE IT."',
    body: 'Mrs. Odell, certified, sets up her folding table at the yard office TOMORROW. Forty dollars a look, three looks a visit, and she does not pick a thing up until she has finished looking at it. She buys nothing. "That," she says, "is the point."',
    img: 'appraiser' },
  { id: 'appraiser_bus', kind: 'buyer_hint', buyer: 'appraiser',
    headline: 'THE APPRAISER IS ON THE MORNING BUS',
    body: 'Mrs. Odell arrives TOMORROW with the reference book and the two hundred slips of paper in it. Three verdicts a day, forty dollars each, no exceptions, no favourites. Anyone hoping she will "just glance" at something is advised that she has heard that before.',
    img: 'appraiser' },
  { id: 'antique_fair', kind: 'buyer_hint', buyer: 'alice',
    headline: 'ANTIQUE DEALERS ROLL IN FOR THE WEEKEND',
    body: 'Antique Alice and her ilk arrive TOMORROW, wallets fat, monocles polished. Sellers holding furniture, silver, and jewelry may want to sit on it one more night.',
    img: 'antique_fair' },
  { id: 'alice_estate_call', kind: 'buyer_hint', buyer: 'alice',
    headline: 'ANTIQUE ALICE "BETWEEN ESTATE SALES," IN TOWN TOMORROW',
    body: 'The dealer known for paying well, once, and in cash will be at the yard TOMORROW between two estate sales. She is, sources say, "in a buying mood and a hurry." Furniture, silver, jewelry. Polish nothing; she can tell.',
    img: 'antique_fair' },
  { id: 'randy_tour', kind: 'buyer_hint', buyer: 'randy',
    headline: 'RIFF RANDY\'S TOUR VAN BREAKS DOWN OUTSIDE TOWN; HE\'S BUYING WHILE IT\'S FIXED',
    body: 'The van will be ready TOMORROW afternoon. Until then Randy is at the yard with cash and, in his words, "nothing but time and taste." Amps, records, anything that hums. Collectibles too, if they are loud.',
    img: 'record_swap' },
  { id: 'gina_recall', kind: 'buyer_hint', buyer: 'gina',
    headline: 'GINA\'S GARAGE NEEDS PARTS, TOOLS, "ANYTHING WITH A CORD," TOMORROW',
    body: 'A recall on a part Gina does not stock has her buying everything mechanical she can find TOMORROW. Tools, electronics, appliances that turn on. Bring it in working and she pays. Bring it in broken and she looks at you.',
    img: 'tool_show' },
  { id: 'carl_shelf', kind: 'buyer_hint', buyer: 'carl',
    headline: 'CARL "HAS A NEW SHELF." CARL IS IN TOWN TOMORROW.',
    body: 'The buyer some call Creepy Carl has, by his own account, built a new shelf and needs to fill it. Weird things, wrong things, things in jars. Triple, cash, TOMORROW. He asks that sellers not describe what they are selling. He will know.',
    img: 'oddities_buyer' },
  { id: 'record_swap', kind: 'buyer_hint', buyer: 'randy',
    headline: 'VINYL SWAP MEET COMES TO DUSTY FLATS',
    body: 'Riff Randy is expected in town TOMORROW, hunting gear, wax, and anything with a story. Music junk becomes music money, briefly.',
    img: 'record_swap' },
  { id: 'tool_show', kind: 'buyer_hint', buyer: 'gina',
    headline: 'TRADE SHOW BRINGS GEARHEADS TO TOWN',
    body: 'Gearhead Gina hits {town} TOMORROW with a cash box and a checklist: tools, electronics, anything that plugs in or torques down.',
    img: 'tool_show' },
  { id: 'oddities_buyer', kind: 'buyer_hint', buyer: 'carl',
    headline: '"ODDITIES COLLECTOR" SPOTTED AT THE DINER, AGAIN',
    body: 'Creepy Carl is back in town TOMORROW. He pays triple for the things nobody else will touch, and he pays in exact change. Do not ask what the collection is for.',
    img: 'oddities_buyer' },

  // ---------- set rumors (never a unit number, never a checklist) ----------
  { id: 'sunday_estate', kind: 'set_hint', set: 'sundayTable',
    headline: 'WHO SPLIT UP THE HALLORAN DINING SET?',
    body: 'Estate men swear the old dining set went into storage complete: table, chairs, the good linens, even the gravy boat. The paperwork says otherwise. The pieces are out there, folks, scattered across units like a bad divorce.',
    img: 'sunday_estate' },
  { id: 'sunday_auctioneer', kind: 'set_hint', set: 'sundayTable',
    headline: 'AUCTIONEER RECALLS "A SUNDAY TABLE," GOES QUIET',
    body: 'Asked about the finest lot he ever called, the auctioneer described a family table set for six, cloth pressed, boat gleaming. "Split up and sold dumb," he said, and would not say more. Matching grain is worth money, folks.',
    img: 'sunday_auctioneer' },
  { id: 'sunday_gravy', kind: 'set_hint', set: 'sundayTable',
    headline: 'LETTER TO THE EDITOR: "IT NEEDS ITS GRAVY BOAT"',
    body: 'A reader writes: "You can buy all the tables you want. Without the boat and the Sunday cloth it is just wood." The editor has no idea what this is about and prints it in full.',
    img: 'sunday_gravy' },

  // ---------- legendary rumors ----------
  // ---------- the other sets ----------
  { id: 'tour_caddy', kind: 'set_hint', set: 'tourBag',
    headline: 'OLD CADDY SWEARS THE \'62 BAG IS "STILL IN THE COUNTY, STILL COMPLETE"',
    body: 'He carried it that season and he says the irons, the bag and "the can of balls he never opened" went into storage together when the man retired. "Split up, it\'s junk," he said. "Together it\'s the season."',
    img: 'gen_record' },
  { id: 'tour_scorecard', kind: 'set_hint', set: 'tourBag',
    headline: 'LETTER: "WHOEVER HAS THE SCORECARD HAS THE WHOLE THING"',
    body: 'A reader writes that a tour bag without its scorecard "is a bag." The editor, who does not golf, prints it because the reader signed it "a caddy" and underlined it twice.',
    img: 'gen_record' },
  { id: 'backline_roadie', kind: 'set_hint', set: 'backline',
    headline: 'ROADIE: THE BAND\'S BACKLINE "WENT INTO STORAGE AS A SET, CAME OUT AS PIECES"',
    body: 'The guitar, the road case, the amp and "the pedal, boxed, never opened" were packed together the night the tour ended. They have been sold, one at a time, ever since. "Somebody ought to put it back together," he said. "It sounds like something together."',
    img: 'gen_banned' },
  { id: 'backline_pedal', kind: 'set_hint', set: 'backline',
    headline: 'MUSIC SHOP OWNER ON THE FAMOUS PEDAL: "IT\'S IN A BOX IN A BOX"',
    body: 'Asked about the pedal collectors keep calling about, the owner said it was boxed at the factory, boxed again by the band, and "is in somebody\'s unit inside a third box with something dull written on it." He would not say what.',
    img: 'gen_banned' },
  { id: 'nugget_landlady', kind: 'legend_hint', legend: 'nugget',
    headline: 'LANDLADY\'S GREAT-GRANDDAUGHTER: "HE LEFT A SOCK. WE KEPT THE SOCK."',
    body: 'The family has the sock. The family does not have the nugget. "It was in the sock and then it was in the things and then the things were in storage," she said, "and then storage was a different building, and then it was this one." The sock is on display at the Shopper office.',
    img: 'dry_creek_nugget' },
  { id: 'deed_clerk_two', kind: 'legend_hint', legend: 'deed',
    headline: 'CLERK FINDS 1879 LEDGER ENTRY: "DEED TO STORAGE, ROW C"',
    body: 'The ledger predates the yard, which is on Row C. "It says what it says," the clerk said, and closed it. The Correction notes that Row C has been renumbered four times since, and that the paper printed each renumbering wrong.',
    img: 'deed_original' },
  { id: 'gavel_drawer', kind: 'legend_hint', legend: 'gavel',
    headline: 'RAY: "THE GAVEL\'S IN A DRAWER." REVEREND: "IT IS NOT IN A DRAWER."',
    body: 'The auctioneers agree it is in storage and disagree on everything after that. The Tines notes that both men have bid, quietly, on units with desks in them, and that neither has won one. The drawer, if it exists, is waiting.',
    img: 'gavel_founders' },
  { id: 'jar_nurse_two', kind: 'legend_hint', legend: 'jarThing',
    headline: 'THE DOCTOR\'S NURSE, 94, WILL SAY ONE MORE THING ABOUT THE JAR',
    body: '"It was in the unit with the good chair," she said, and then nothing else, for an hour, and then, "he talked to it." The Echo prints this without comment. The Echo has no comment.',
    img: 'jar_thing' },
  { id: 'cameo_maid', kind: 'legend_hint', legend: 'cameo',
    headline: 'LADY VERMILLION\'S MAID, IN A LETTER: "I PUT IT WHERE SHE TOLD ME"',
    body: 'The letter, found in a unit and sold to the Register for a sum it will not disclose, says the cameo went "with the linens, in the small trunk, where nobody who mattered would look." The Register has looked. The Register did not matter, apparently.',
    img: 'cameo_lady' },
  { id: 'stamps_postmaster', kind: 'legend_hint', legend: 'stampSheet',
    headline: 'POSTMASTER\'S GRANDSON: "HE KEPT IT IN THE STAMP DRAWER. WITH THE STAMPS."',
    body: '"Hiding in plain sight," the grandson says, "was his whole personality." The drawer went to storage with the desk. The desk went to storage with the office. The office, the Thermostat notes, was climate controlled before the phrase existed.',
    img: 'stamps_kettle' },
  { id: 'crown_queen', kind: 'legend_hint', legend: 'pageantCrown',
    headline: 'THE 1971 QUEEN, NOW 72, ON THE CROWN: "IT\'S IN A HAT BOX. I MEAN IT WAS."',
    body: 'She kept it in a hat box in a closet in a house that was sold with the closet full. "The new people put everything in storage," she said. "They didn\'t know. Nobody knew. It looks like a toy until you pick it up."',
    img: 'crown_pageant' },
  { id: 'jeweled_egg_towel', kind: 'legend_hint', legend: 'jewelEgg',
    headline: 'THE BATH TOWEL EXISTS. A RED MESA WOMAN HAS IT. THE EGG IS NOT IN IT.',
    body: 'She bought a unit for the linens and found, among them, a towel "with the shape of something heavy still in it." The Ledger has seen the towel. The shape is oval. The woman has kept the towel and would like it known she is not looking for the egg. She is looking for the egg.',
    img: 'jeweled_egg' },
  { id: 'sunday_leaf', kind: 'set_hint', set: 'sundayTable',
    headline: 'FURNITURE MAN: "THE LEAF IS IN A BOX MARKED KITCHEN. IT ALWAYS IS."',
    body: 'Asked how to find the missing leaf of any dining table, the county\'s last furniture restorer said every family does the same thing. "Kitchen box. Under the towels. They think they\'ll need it at Thanksgiving." They do not, until somebody buys the table.',
    img: 'sunday_estate' },
  { id: 'gold_jacket_seamstress', kind: 'legend_hint', legend: 'goldJacket',
    headline: 'SEAMSTRESS WHO SEWED THE GOLD JACKET: "IT WEIGHED NINE POUNDS"',
    body: 'Ninety-one and sharp, she remembers every sequin. "Real thread, real weight. The copies are light. You\'ll know it when you lift it." She sewed a second lining for it, she says, "for a reason he never told me."',
    img: 'gold_jacket' },
  { id: 'moon_rock_drawer', kind: 'legend_hint', legend: 'moonRock',
    headline: 'COURIER\'S WIDOW: "HE KEPT IT IN THE DESK. THEN THE DESK WENT TO STORAGE."',
    body: 'She would not say which desk or which storage. She would say it "sat there like a paperweight for thirty years and nobody asked." Somebody, she added, has been asking lately.',
    img: 'moon_rock' },
  { id: 'goon_map_kid', kind: 'legend_hint', legend: 'goonMap',
    headline: 'MAN WHO SAW THE MAP AS A BOY DRAWS IT FROM MEMORY; IT IS NOT GOOD',
    body: 'The drawing, published here at his insistence, shows rocks, an X, and what may be a boat or a hat. "It was better than this," he said. "It had a smell." Collectors are reminded the real map is drawn on the back of a menu.',
    img: 'goon_map' },
  { id: 'gold_jacket', kind: 'legend_hint', legend: 'goldJacket',
    headline: 'THE GOLD JACKET: STILL OUT THERE?',
    body: 'Forty years since the King of the County Fair vanished mid-tour, and his famous gold jacket has never surfaced. Estate lawyers insist it was "in storage, somewhere dry." Locals keep bidding.',
    img: 'gold_jacket' },
  { id: 'moon_rock', kind: 'legend_hint', legend: 'moonRock',
    headline: 'DID A MOON ROCK REALLY GO MISSING IN 1974?',
    body: 'A retired courier swears a sample case never made it back to the lab, and that a man in Dusty Flats "kept it in a drawer like a paperweight." NASA declined to comment. They always do.',
    img: 'moon_rock' },
  { id: 'goon_map', kind: 'legend_hint', legend: 'goonMap',
    headline: 'THE ATTIC MAP: ONE MORE GENERATION BELIEVES',
    body: 'Every kid in this county grew up on it: a hand-drawn map from somebody\'s attic, an X out past the rocks, a one-eyed pirate nobody can name. The last family who claimed to have it left town in a hurry, and their storage went delinquent. This could be our time. It could be down there.',
    img: 'goon_map' },
  { id: 'dry_creek_nugget', kind: 'legend_hint', legend: 'nugget',
    headline: "THE DRY CREEK NUGGET: 140 YEARS, STILL IN SOMEBODY'S SOCK",
    body: 'In 1881 a prospector walked into the Salt Lick saloon with a fist of gold, bought the bar a round, and was never seen again. His landlady\'s family swears the nugget "went into storage with the rest of his things." Rent has not been paid since 1881.',
    img: 'dry_creek_nugget' },
  { id: 'nugget_assayer', kind: 'legend_hint', legend: 'nugget',
    headline: 'FOOL\'S GOLD FLOODS COUNTY; ASSAYER "TIRED"',
    body: 'Six nuggets came to the county assayer this month. Six were pyrite. "It sparkles," he said. "Gold doesn\'t sparkle. Gold just sits there being heavy." The real one is still out there. Somebody is always certain.',
    img: 'nugget_assayer' },
  { id: 'deed_original', kind: 'legend_hint', legend: 'deed',
    headline: 'THE ORIGINAL DEED TO GYPSUM CITY: STILL MISSING, STILL BINDING',
    body: 'The 1879 deed grants "the valley, the creek, and whatever is under them" to one family, and the county has never found it. Lawyers say whoever holds it holds the town. The last holder put his papers in storage and died owing rent.',
    img: 'deed_original' },
  { id: 'deed_forgeries', kind: 'legend_hint', legend: 'deed',
    headline: 'FOURTH FORGED DEED THIS YEAR; CLERK "NOT EVEN SURPRISED"',
    body: 'The county clerk has developed a test: the real deed is signed in iron gall ink that has gone brown, and the seal is cracked through the letter G. "They always make the seal too nice," she said. "Nobody keeps a real seal nice."',
    img: 'deed_forgeries' },
  { id: 'gavel_founders', kind: 'legend_hint', legend: 'gavel',
    headline: "THE FOUNDERS' GAVEL: BOTH AUCTIONEERS CLAIM IT, NEITHER HAS IT",
    body: 'Bent Fork was founded at an auction, and the gavel that sold the first lot has been missing since the feud began. Ray says it is his by right. The Reverend says it is his by blood. The last man to hold it kept it "somewhere the other one would never look," which in this town means storage.',
    img: 'gavel_founders' },
  { id: 'gavel_souvenirs', kind: 'legend_hint', legend: 'gavel',
    headline: 'GIFT SHOP SELLS "FOUNDERS\' GAVEL" REPLICAS; TOWN ASKS THEM TO STOP',
    body: 'The replicas are pine. The real gavel is black walnut with a brass band and a head worn flat on one side, because the founder only ever struck it one way. "If it looks even," said the Reverend, "it isn\'t."',
    img: 'gavel_souvenirs' },
  { id: 'jar_thing', kind: 'legend_hint', legend: 'jarThing',
    headline: 'THE MARROW CREEK THING: LAST SEEN IN A JAR, LAST JAR SEEN IN STORAGE',
    body: 'Pulled from the creek in 1961, shown at the county fair once, and withdrawn after "the incident with the lights." The doctor who kept it moved his whole practice into a storage unit and stopped paying. The jar, they say, is still sealed. They say it because they have to.',
    img: 'jar_thing' },
  { id: 'jar_rubber', kind: 'legend_hint', legend: 'jarThing',
    headline: 'NOVELTY SHOP RECALLS "THING IN A JAR" AFTER SEVENTH FAINTING',
    body: 'The rubber replicas are convincing at a glance and floppy in the hand. The real one, according to the doctor\'s nurse, "does not float. It sits on the bottom and it is heavier than it has any right to be." She would not say more. She has never said more.',
    img: 'jar_rubber' },
  { id: 'cameo_lady', kind: 'legend_hint', legend: 'cameo',
    headline: "LADY VERMILLION'S CAMEO: THE ONE PIECE THE ESTATE SALE NEVER FOUND",
    body: 'When the last Lady Vermillion died, the house sold in a week and the cameo sold in none of it. Her maid swore it went "with the linens, into storage, where the family never looked." Shell on coral, gold oval, and a face that is famously not smiling.',
    img: 'cameo_lady' },
  { id: 'cameo_paste', kind: 'legend_hint', legend: 'cameo',
    headline: 'JEWELER WARNS: "EVERY CAMEO IN THIS TOWN IS PASTE UNTIL PROVEN OTHERWISE"',
    body: 'Copies have circulated for sixty years. The real one, he says, is carved from a single shell and "the coral behind her is warm to the hand." The copies are cold. "Everything expensive here is cold," he added, and would not explain.',
    img: 'cameo_paste' },
  { id: 'stamps_kettle', kind: 'legend_hint', legend: 'stampSheet',
    headline: 'THE INVERTED KETTLE: A PRINTING ERROR WORTH MORE THAN THE PRINT SHOP',
    body: 'In 1934 a Kettle Basin post office received one sheet of the commemorative kettle stamp printed upside down. The postmaster kept it. His unit has been climate controlled since before the phrase existed. Rent stopped. The thermostat did not.',
    img: 'stamps_kettle' },
  { id: 'stamps_reprint', kind: 'legend_hint', legend: 'stampSheet',
    headline: 'REPRINTS OF THE FAMOUS SHEET SOLD AS "GENUINE"; DEALERS "EMBARRASSED"',
    body: 'The reprints are crisp. The original has been in a drawer for ninety years and, according to the one dealer who has seen it, "smells faintly of a very old kettle." Collectors are advised to trust their noses and nobody else.',
    img: 'stamps_reprint' },
  { id: 'crown_pageant', kind: 'legend_hint', legend: 'pageantCrown',
    headline: 'THE PAGEANT CROWN: REAL STONES, REAL TEARS, STILL MISSING',
    body: 'The Miss Chrome Springs crown was set with real stones by a founder with more money than sense. It was last worn in 1971, and the family of that year\'s queen has "storage in three counties and a lawyer in each." The stones, they say, are cold and heavy. Rhinestones are neither.',
    img: 'crown_pageant' },
  { id: 'crown_rhinestone', kind: 'legend_hint', legend: 'pageantCrown',
    headline: 'COUNTY FAIR CROWNS "INDISTINGUISHABLE" FROM THE REAL THING, AT A DISTANCE',
    body: 'Up close, the pageant committee says, the difference is weight: the real crown "sits on the head like a debt." The replicas float. Six replicas have been sold as the original this decade. One buyer wept. He was not the queen.',
    img: 'crown_rhinestone' },
  { id: 'jeweled_egg', kind: 'legend_hint', legend: 'jewelEgg',
    headline: 'THE JEWELED EGG OF DUSTY FLATS: FACT OR BAR STORY?',
    body: 'Every town has one story too good to be true. Ours involves a czar, a card game, and a jeweled egg that ended up wrapped in a bath towel in somebody\'s storage unit. Probably nonsense. Probably.',
    img: 'jeweled_egg' },

  // ---------- diary stamps: found papers write tomorrow's edition ----------
  { id: 'sal_diary', kind: 'diary_stamp',
    headline: 'FOUND DIARY NAMES LOCAL BIDDER; TOWN DELIGHTED',
    body: 'A diary surfaced at auction this week whose author repeatedly describes a man who "bids on principle and cries in his truck." Spite Sal denies being Spite Sal. The diary remains in private hands, and the town remains insufferable about it.',
    img: 'sal_diary' },

  // ---------- Salt Lick: the Shopper. Free, and priced accordingly. ----------
  { id: 'salt_coupon', kind: 'flavor', town: 'saltLick',
    headline: 'COUPON PAGE PRINTED UPSIDE DOWN; NOBODY NOTICES FOR A WEEK',
    body: 'The Shopper regrets nothing. Readers who turned the page over report the coupons "worked fine." The feed store honored a coupon for a product it does not sell, out of respect.',
    img: 'salt_coupon' },
  { id: 'salt_rock', kind: 'flavor', town: 'saltLick',
    headline: 'COUNTY CONFIRMS: THE SALT LICK IS A REAL ROCK, AND YES, PEOPLE LICK IT',
    body: 'The rock sits behind the storage yard and has for longer than the yard. Cattle used it first. Tourists use it now. The manager asks that bidders wait until after the auction.',
    img: 'salt_rock' },
  { id: 'salt_boxes', kind: 'flavor', town: 'saltLick',
    headline: 'LOCAL WOMAN OWNS FOUR THOUSAND CARDBOARD BOXES, "ALL SPOKEN FOR"',
    body: 'She would not say what is in them. She would not say who they are for. She did say the tape on a box "tells you everything," and then looked at this reporter\'s shoes for a long time.',
    img: 'salt_boxes' },
  { id: 'salt_scale', kind: 'flavor', town: 'saltLick',
    headline: 'TRUCK SCALE AT THE FEED STORE DECLARED "CLOSE ENOUGH"',
    body: 'The scale has read four hundred pounds heavy since the flood. The county inspector shrugged. One local hauler uses it exclusively and has never once complained.',
    img: 'salt_scale' },
  { id: 'salt_wind', kind: 'flavor', town: 'saltLick',
    headline: 'WIND MOVES ENTIRE STORAGE ROW FOUR INCHES EAST; MANAGER SHRUGS',
    body: 'Row C is now four inches closer to the highway. "It was leaning that way anyhow," said the manager, who has moved his chair. Renters are advised their units are still their units.',
    img: 'salt_wind' },
  { id: 'salt_trophy', kind: 'flavor', town: 'saltLick',
    headline: 'SALT LICK WINS "DUSTIEST TOWN" NINTH YEAR RUNNING; TROPHY LOST IN STORAGE',
    body: 'The trophy was placed in a unit for safekeeping in a year nobody can agree on. The unit is delinquent. The town council has asked bidders to "keep an eye out, and maybe wipe it."',
    img: 'salt_trophy' },
  // ---------- more classifieds, everywhere ----------
  { id: 'ad_locksmith', kind: 'ad', body: 'LOCKSMITH. Safes, strongboxes, "I lost the key." Cash. No questions. One question: is it yours.' },
  { id: 'ad_van_wash', kind: 'ad', body: 'VAN WASH, $5. We do not ask what was in it. We can usually tell.' },
  { id: 'ad_estate', kind: 'ad', body: 'ESTATE SALE SATURDAY. Everything must go. Everything has been going since March.' },
  { id: 'ad_dolly', kind: 'ad', body: 'HAND TRUCK FOR RENT. Two wheels. Both round. Ask for Bucky at the scrapyard.' },
  { id: 'ad_appraiser', kind: 'ad', body: 'APPRAISALS. Honest. Fast. You will not like it. $20, or $40 to say it nicely.' },
  { id: 'ad_raccoon', kind: 'ad', body: 'LOST: nothing. FOUND: a raccoon that answers to "Deposits." He is not lost. He is ours. Please stop calling.' },
  { id: 'ad_notebook', kind: 'ad', body: 'FOUND: a page from a notebook, columns of numbers, one word underlined. Owner may collect from the office. Owner knows who he is.' },
  { id: 'ad_choir', kind: 'ad', body: 'THE CHURCH CHOIR is auditioning. Any voice. Any key. Yiip Dutch need not apply again.' },
  { id: 'ad_scale', kind: 'ad', body: 'WILL WEIGH ANYTHING. Trucks, units, arguments. Reads heavy. Ask for Pruitt.' },
  { id: 'ad_sal', kind: 'ad', body: 'WILL PAY STUPID for whatever they are buying. You know who they are. You know who I am. — S.' },
  { id: 'ad_storage', kind: 'ad', body: 'STORAGE UNITS AVAILABLE. Dry. Mostly. Rent due the first. Delinquent the second. Auctioned the third. We are joking about the third.' },
  { id: 'ad_pete_late', kind: 'ad', body: "PAWN PETE'S is open. Pete is asleep. Ring twice. Bring the thing." },
  { id: 'ad_alice_call', kind: 'ad', body: 'ANTIQUE ALICE will look at your grandmother\'s things. She will not look at your grandmother. Appointments.' },
  { id: 'ad_randy_amp', kind: 'ad', body: 'RIFF RANDY BUYS AMPS. Working, humming, on fire. "On fire" is a little less.' },
  { id: 'ad_gina_hours', kind: 'ad', body: "GINA'S GARAGE. Open when the door is up. The door is up. Bring it in running or bring it in on a truck." },
  { id: 'ad_carl_shelf', kind: 'ad', body: 'WANTED: things you cannot explain. Will pay. Will not explain either. — C.' },
  { id: 'ad_roy_cousin', kind: 'ad', body: "ROY'S COUSIN restores furniture overnight. $40. He does not restore people. Stop asking." },
  { id: 'ad_ed_notes', kind: 'ad', body: 'FOUND at the yard: a page of numbers with one circled. If it is yours, you already know which unit. — the office' },
  { id: 'ad_bart_lot', kind: 'ad', body: 'BIG BART\'S LOT: trucks, trailers, a boat. Financing available. Financing is Bart. Bart is available.' },
  { id: 'ad_dutch_tire', kind: 'ad', body: "DUTCH'S TIRE & LUBE. You will hear us before you see us. Yip." },
  { id: 'ad_duo_resale', kind: 'ad', body: 'C&K RESALE — "the good stuff, online." He lifts. She lists. They argue. You save.' },
  { id: 'ad_unit13', kind: 'ad', body: 'UNIT 13 is not for rent. Unit 13 is not for sale. Unit 13 would like that noted.' },
  { id: 'ad_gloves', kind: 'ad', body: 'WHITE COTTON GLOVES, by the dozen. For handling the good things. For handling the bad things. Same gloves.' },
  { id: 'ad_hauler_two', kind: 'ad', body: 'HIGHWAY SCRAP. You left it, we took it. If you want it back, that is a different price.' },
  { id: 'ad_diner_tab', kind: 'ad', body: "ROY'S DINER. Pie is pie. Tabs are tabs. Both are due." },
  { id: 'ad_map', kind: 'ad', body: 'MAPS OF THE COUNTY, hand-inked, mostly accurate. The X is decorative. Probably.' },
  { id: 'ad_choir_two', kind: 'ad', body: 'CHOIR REHEARSAL moved to the yard on account of the acoustics. The acoustics are Dutch.' },
  { id: 'ad_bidder_card', kind: 'ad', body: 'BIDDER NUMBERS, $75, at the office. Laminated. Spelled approximately.' },
  { id: 'ad_missing_leaf', kind: 'ad', body: 'MISSING: one table leaf, oak, the good one. Reward. Check your kitchen boxes. Check everybody\'s.' },
  { id: 'ad_flashlight', kind: 'ad', body: 'FLASHLIGHT BATTERIES. The general store has them. The dark does not care.' },
  { id: 'ad_van_bigger', kind: 'ad', body: 'YOUR VAN IS TOO SMALL. We have seen it. — Dusty Flats Motors' },
  { id: 'salt_ad_boxes', kind: 'ad', town: 'saltLick', body: 'BOXES. BOXES. BOXES. Used once, taped careful. Ask for Bev. No, she will not sell.' },
  { id: 'salt_ad_pruitt', kind: 'ad', town: 'saltLick', body: 'PRUITT HAULING. Scale on the truck. "If it has weight, it has a price." Cash by the pound.' },
  { id: 'salt_ad_salt', kind: 'ad', town: 'saltLick', body: 'FREE SALT. Bring your own lick. Behind the yard, past the rock. Ask nobody.' },

  // ---------- Gypsum City: the Correction. Right about everything but the number. ----------
  { id: 'gyp_correction', kind: 'flavor', town: 'gypsumCity',
    headline: 'CORRECTION: YESTERDAY\'S UNIT NUMBER WAS A UNIT NUMBER',
    body: 'The Correction regrets that yesterday\'s front page named a unit. The unit exists. The story was accurate. The number was, in the editor\'s words, "a number." Readers are reminded to look at the doors.',
    img: 'gyp_correction' },
  { id: 'gyp_editor', kind: 'flavor', town: 'gypsumCity',
    headline: 'EDITOR DEFENDS RECORD: "EVERY STORY WE PRINT IS TRUE"',
    body: '"Name one story that wasn\'t true," the editor said, at length, from the doorway of the office, to a reporter from his own paper. Asked about unit numbers, he closed the door. The door was correctly numbered.',
    img: 'gyp_editor' },
  { id: 'gyp_numbers', kind: 'flavor', town: 'gypsumCity',
    headline: 'STORAGE YARD REPAINTS UNIT NUMBERS; PAPER DECLINES TO LEARN THEM',
    body: 'The yard has painted fresh numbers on every door. The Correction has received a copy of the new layout and has, per policy, filed it. "We know which unit we mean," said the editor. "We\'ve always known. It\'s the printing."',
    img: 'gyp_numbers' },
  { id: 'gyp_watchmaker', kind: 'flavor', town: 'gypsumCity',
    headline: 'RETIRED WATCHMAKER\'S UNIT "DEFINITELY ON THE ROW," SAYS EVERYONE',
    body: 'Everyone in town agrees the watchmaker kept his bench and his tiny drawers in storage. Everyone in town also has a different unit number for it. The paper printed one of them. It regrets nothing yet.',
    img: 'gyp_watchmaker' },
  { id: 'gyp_gypsum', kind: 'flavor', town: 'gypsumCity',
    headline: 'GYPSUM CITY HAS NO GYPSUM, SURVEY CONFIRMS FOR THIRD TIME',
    body: 'The founders named the town after a mineral that is not here, and the town has never corrected it. "It\'s a tradition," said the mayor, who was elected on a ballot that spelled his name wrong.',
    img: 'gyp_gypsum' },
  { id: 'gyp_ad_read', kind: 'ad', town: 'gypsumCity', body: 'READ THE CORRECTION. Then read the doors. Then read the Correction again. 25 cents.' },
  { id: 'gyp_ad_hattie', kind: 'ad', town: 'gypsumCity', body: 'HATTIE\'S RESALE — "As seen in the paper." Every item comes with the clipping. Numbers may vary.' },
  { id: 'gyp_ad_delgado', kind: 'ad', town: 'gypsumCity', body: 'DELGADO BUYS UNITS. Not the ones in the paper. The other ones. You know the ones.' },

  // ---------- Bent Fork: the Tines. Two columns, two auctioneers, one grudge. ----------
  { id: 'fork_feud', kind: 'flavor', town: 'bentFork',
    headline: 'AUCTIONEER FEUD ENTERS THIRTY-FIRST YEAR; TOWN STILL PICKS SIDES BY HAT',
    body: 'Ray\'s people wear ball caps. The Reverend\'s people wear brims. The storage yard alternates gavels by a schedule nobody will explain, and bidders are advised to check the lot before they check the doors.',
    img: 'fork_feud' },
  { id: 'fork_speed', kind: 'flavor', town: 'bentFork',
    headline: 'RAY DUNMORE SELLS UNIT IN ELEVEN SECONDS; BUYER "STILL PARKING"',
    body: 'The buyer arrived to find he had won a 10x10 he had not seen. "Ray said a number and I nodded at a fly," he reported. Ray called the sale "clean." Rivals under Ray raise in doubles and rarely come back once they fold.',
    img: 'fork_speed' },
  { id: 'fork_sermon', kind: 'flavor', town: 'bentFork',
    headline: 'REVEREND PETTIBONE\'S AUCTION RUNS FOUR HOURS; THREE BIDDERS "SAVED"',
    body: 'The Reverend paused a bidding war to speak on patience, then invited a man who had folded to "search his heart," which he did, for another two hundred dollars. The yard talks more when the Reverend has the gavel. That is not always a kindness.',
    img: 'fork_sermon' },
  { id: 'fork_fork', kind: 'flavor', town: 'bentFork',
    headline: 'THE BENT FORK IS BENT AGAIN AFTER BRIEF, CONTROVERSIAL STRAIGHTENING',
    body: 'The forty-foot fork at the town line was straightened by a visiting welder in the spring. Both auctioneers, in a rare joint statement, called it "an outrage." It was re-bent Tuesday.',
    img: 'fork_fork' },
  { id: 'fork_schedule', kind: 'flavor', town: 'bentFork',
    headline: 'WHO HAS THE GAVEL TOMORROW? YARD OFFICE "CAN\'T SAY, WON\'T SAY"',
    body: 'The schedule is posted at dawn, on the yard board, by whoever gets there first. Ray gets there first about half the time. Regulars have learned to read the parking lot: Cobb\'s truck means Ray; Sister Dee\'s sedan means the Reverend.',
    img: 'fork_schedule' },
  { id: 'fork_ad_ray', kind: 'ad', town: 'bentFork', body: 'DUNMORE AUCTIONS — "Fast. Fair. Done." Bring cash and a decision.' },
  { id: 'fork_ad_lyle', kind: 'ad', town: 'bentFork', body: 'PETTIBONE & SON AUCTIONEERS — Est. before the other one. All are welcome. All are talked to.' },

  // ---------- Marrow Creek: the Echo. It heard it too. ----------
  { id: 'marrow_carl', kind: 'flavor', town: 'marrowCreek',
    headline: 'CREEPY CARL BUYS SECOND HOUSE IN MARROW CREEK; "FOR THE COLLECTION"',
    body: 'The buyer known countywide as Creepy Carl has purchased the old dentist\'s house on Fenn Street, his second in town. Neighbors report the basement lights are on at all hours and "sort of pulse." Carl declined to comment, at length, from behind the door.',
    img: 'marrow_carl' },
  { id: 'marrow_thirteen', kind: 'flavor', town: 'marrowCreek',
    headline: 'UNIT 13 SORTED ITSELF AGAIN; MANAGER "DONE ASKING QUESTIONS"',
    body: 'For the fourth time this month, unit 13 was found squared away at dawn: boxes stacked, furniture squared, a mannequin turned to face the corner. "I\'ve stopped writing it up," said the manager. "It\'s tidy. I\'ll take tidy."',
    img: 'marrow_thirteen' },
  { id: 'marrow_creek', kind: 'flavor', town: 'marrowCreek',
    headline: 'MARROW CREEK STILL NOT A CREEK, GEOLOGISTS REPEAT, TIREDLY',
    body: 'The channel behind the storage yard has never held water in recorded history. It does hold fog, on Tuesdays, and a smell the county describes as "mineral." The town has voted, again, to keep calling it a creek.',
    img: 'marrow_creek' },
  { id: 'marrow_normal', kind: 'flavor', town: 'marrowCreek',
    headline: 'LOCAL MAN STORES ORDINARY COUCH; NEIGHBORS "CONCERNED"',
    body: 'The couch is beige. It has no history. It was placed in a unit on Row B with nothing else, and the yard has been uneasy since. "It\'s the only normal thing on the row," said one bidder. "That\'s what worries me."',
    img: 'marrow_normal' },
  { id: 'marrow_wanda', kind: 'flavor', town: 'marrowCreek',
    headline: 'TAXIDERMIST WINS COUNTY RIBBON FOR "PIECE SHE WILL NOT DESCRIBE"',
    body: 'Wanda Voss took first in the open category with an entry judges called "technically flawless" and "wrong." It was displayed under a cloth. The cloth moved once. The judges have asked not to be contacted.',
    img: 'marrow_wanda' },
  { id: 'marrow_ad_carl', kind: 'ad', town: 'marrowCreek', body: 'CARL IS BUYING. Weird things. Wrong things. Things with eyes. Triple, cash, no questions, some staring.' },
  { id: 'marrow_ad_wanda', kind: 'ad', town: 'marrowCreek', body: 'VOSS TAXIDERMY — "We can fix that." Also: "We can make it worse." Ask about our jars.' },
  { id: 'marrow_ad_normal', kind: 'ad', town: 'marrowCreek', body: 'WANTED: one (1) normal lamp. Not humming. Not warm. Ask for Ferrell. Please.' },

  // ---------- Vermillion: the Register. Society, property, provenance. ----------
  { id: 'verm_gala', kind: 'flavor', town: 'vermillion',
    headline: 'STORAGE YARD GALA RAISES RECORD SUM; NOBODY SURE FOR WHAT',
    body: 'The annual black-tie evening at the Vermillion Self-Store raised eleven thousand dollars. The cause was not printed on the invitation and was not mentioned in the speeches. "It\'s the gala," said the chairwoman. "One attends."',
    img: 'verm_gala' },
  { id: 'verm_finish', kind: 'flavor', town: 'vermillion',
    headline: 'RESTORER FINED FOR "GILDING PINE AND CALLING IT WALNUT"',
    body: 'The finish, inspectors said, was immaculate. The wood underneath was "from a pallet." The restorer\'s defense was that everyone in Vermillion does this, which the judge acknowledged before fining him anyway. Bidders are reminded: the finish is a costume.',
    img: 'verm_finish' },
  { id: 'verm_engraved', kind: 'flavor', town: 'vermillion',
    headline: 'BIDDER NUMBERS NOW ENGRAVED; PAPER ONES "NO LONGER RECOGNIZED"',
    body: 'The yard has switched to brass bidder plates engraved by the jeweler on Rue Street. Out-of-town bidders with laminated cards will be admitted, said the clerk, "in the sense that we will not physically stop them."',
    img: 'verm_engraved' },
  { id: 'verm_loupe', kind: 'flavor', town: 'vermillion',
    headline: 'MAN WITH LOUPE BANNED FROM YARD, THEN UNBANNED, THEN GIVEN A CHAIR',
    body: 'Adrien Vale was asked to stop examining door seams with a jeweler\'s loupe, then asked to continue after he identified a Goldtop through a two-inch gap. The yard has provided him with a chair. He has not sat in it.',
    img: 'verm_loupe' },
  { id: 'verm_chrome', kind: 'flavor', town: 'vermillion',
    headline: 'LOCAL MAN\'S ENTIRE COLLECTION "PLATED," APPRAISER CONFIRMS TO HIS FACE',
    body: 'Chrome Charlie brought forty pieces to the appraiser on Rue Street. Forty pieces were plated. "They\'re still shiny," Charlie said, on the way out, which is true.',
    img: 'verm_chrome' },
  { id: 'verm_ad_loupe', kind: 'ad', town: 'vermillion', body: 'RUE STREET JEWELERS. Loupes, hallmarks, the truth. Appraisals by appointment. Bring tissues.' },
  { id: 'verm_ad_gilt', kind: 'ad', town: 'vermillion', body: 'GILDING & FINISHING — "We can make anything look like anything." Discreet. Ask for no one.' },

  // ---------- Kettle Basin: the Thermostat. Seventy-two and forty. Always. ----------
  { id: 'kettle_thermostat', kind: 'flavor', town: 'kettleBasin',
    headline: 'YARD THERMOSTAT TOUCHED BY VISITOR; TOWN "STILL PROCESSING"',
    body: 'An out-of-town bidder adjusted the office thermostat by one degree on Tuesday. He was escorted out. The thermostat was restored. The Thermostat, this paper, has been asked to run a reminder: seventy-two degrees. Forty percent. Always.',
    img: 'kettle_thermostat' },
  { id: 'kettle_mint', kind: 'flavor', town: 'kettleBasin',
    headline: '1958 RADIO PULLED FROM UNIT STILL IN SHRINK WRAP; CROWD APPLAUDS WRAP',
    body: 'The radio was never the point. "Look at the WRAP," said the winning bidder, who then declined to remove it. Kettle Basin units keep things the way they were left. Bidders pay for the way they were left.',
    img: 'kettle_mint' },
  { id: 'kettle_van', kind: 'flavor', town: 'kettleBasin',
    headline: 'MINT CHINA CABINET SURVIVES SIXTY YEARS, DOES NOT SURVIVE ROUTE 9',
    body: 'The cabinet left the yard perfect and arrived home Clean, having ridden under a workbench in a van packed "to the ceiling and then some." The buyer\'s exact words are not printable. Pack the good piece last, or pack less.',
    img: 'kettle_van' },
  { id: 'kettle_gloves', kind: 'flavor', town: 'kettleBasin',
    headline: 'MAN IN WHITE GLOVES SEEN AT YARD; UNIT 40 SELLS FOR TRIPLE',
    body: 'Regulars know the sign. When the museum\'s buyer appears, something in the row is perfect, and the price of perfect goes up. He was asked which unit. He put on a second pair of gloves and said nothing.',
    img: 'kettle_gloves' },
  { id: 'kettle_people', kind: 'flavor', town: 'kettleBasin',
    headline: 'UNITS CLIMATE CONTROLLED; RESIDENTS, PER COUNCIL, "NOT OUR DEPARTMENT"',
    body: 'A petition to extend the yard\'s climate control to the town itself was denied for the fourth year. "The units are fine," said the council. "The people are the people." August is expected to be hot.',
    img: 'kettle_people' },
  { id: 'kettle_ad_wrap', kind: 'ad', town: 'kettleBasin', body: 'BUBBLE WRAP, BLANKETS, STRAPS. Pack it right or pack it twice. At the yard office, cash.' },
  { id: 'kettle_ad_gauge', kind: 'ad', town: 'kettleBasin', body: 'BRASS HUMIDITY GAUGES, pocket size. Know what the dark is doing to your money.' },

  // ---------- Chrome Springs: the Courier. Discretion assured. ----------
  { id: 'chrome_name', kind: 'flavor', town: 'chromeSprings',
    headline: 'CLERK ASKED TO LEARN BIDDERS\' NAMES; CLERK "WILL CONSIDER IT"',
    body: 'The yard office has been reminded that regular bidders have names. The clerk has agreed to learn them "once they have earned one," a standard the office declined to define. Newcomers are still asked "Name?" and then not written down.',
    img: 'chrome_name' },
  { id: 'chrome_plate', kind: 'flavor', town: 'chromeSprings',
    headline: 'HALF OF EVERYTHING IN TOWN IS PLATED, SAYS MAN WHO PLATED IT',
    body: 'The plater on Pierce Avenue has retired and, in retiring, talked. "Gold over brass. Silver over pot metal. Diamonds over nothing at all." He named no clients. He did not need to.',
    img: 'chrome_plate' },
  { id: 'chrome_baroness', kind: 'flavor', town: 'chromeSprings',
    headline: 'BARONESS WINS TWELFTH UNIT THIS SEASON WITHOUT SPEAKING',
    body: 'Her driver raises the paddle. She looks at nothing. The auctioneer has stopped asking if she is sure. Where the Baroness stops, the regulars say, is where the unit is worth exactly what it is worth, and she rarely stops.',
    img: 'chrome_baroness' },
  { id: 'chrome_dex', kind: 'flavor', town: 'chromeSprings',
    headline: 'TECH FOUNDER BUYS UNIT "FOR THE VIBES," DISCOVERS MATTRESSES',
    body: 'Dex Mordant paid six thousand dollars for a 10x20 containing eleven mattresses, which he described online as "a pivot." He has since bought two more units. Rivals report he bids on doors he likes and nothing else.',
    img: 'chrome_dex' },
  { id: 'chrome_fakes', kind: 'flavor', town: 'chromeSprings',
    headline: 'FORGERY RING\'S WORK "BETTER THAN THE ORIGINALS," SAYS EMBARRASSED MUSEUM',
    body: 'Three pieces in the town collection have been reclassified as extremely good fakes. The museum has kept them on display "as a caution." Bidders are advised that in Chrome Springs the fakes are made by professionals.',
    img: 'chrome_fakes' },
  { id: 'chrome_ad_appraise', kind: 'ad', town: 'chromeSprings', body: 'PIERCE AVENUE APPRAISALS. We will tell you. You will not like it. $200.' },
  { id: 'chrome_ad_card', kind: 'ad', town: 'chromeSprings', body: 'ENGRAVED BIDDER CARDS, sterling. For those the clerk has learned to name. Inquire. Or don\'t.' },

  // ---------- more town voices (photos shared) ----------
  { id: 'salt_bev_count', kind: 'flavor', town: 'saltLick',
    headline: 'BOX COUNT REACHES 4,100; OWNER "NOT DONE"',
    body: 'The woman known for her boxes has added a hundred since spring. Asked what is in the new ones she said "the old ones," and asked to explain she said she had. The Shopper has stopped asking.',
    img: 'salt_boxes' },
  { id: 'salt_weigh', kind: 'flavor', town: 'saltLick',
    headline: 'MAN WEIGHS HIS WIFE\'S CAR ON THE FEED STORE SCALE; MARRIAGE "FINE"',
    body: 'He wanted to know. She wanted him not to. The scale, which reads heavy, settled it in his favor and against him at the same time. Pruitt, who was in line, called the number "about right."',
    img: 'salt_scale' },
  { id: 'gyp_twelve', kind: 'flavor', town: 'gypsumCity',
    headline: 'UNIT 12 EXISTS, CONFIRMS YARD, AFTER PAPER NAMED IT NINE TIMES',
    body: 'Following nine front pages naming unit 12, the yard has confirmed there is a unit 12, that it has been empty since March, and that the stories were about other units. "We knew that," said the editor. "So did the readers who read."',
    img: 'gyp_numbers' },
  { id: 'gyp_hattie_sub', kind: 'flavor', town: 'gypsumCity',
    headline: 'READER CANCELS SUBSCRIPTION OVER UNIT NUMBERS, RENEWS BY LUNCH',
    body: 'Headline Hattie canceled the Correction at nine over "an error." At noon she renewed, saying the story had been accurate "in every way that matters," which the paper agrees is the only way that matters.',
    img: 'gyp_editor' },
  { id: 'fork_truce', kind: 'flavor', town: 'bentFork',
    headline: 'AUCTIONEERS SHARE A GAVEL FOR ONE DAY; CROWD "UNSETTLED"',
    body: 'A scheduling error put Ray and the Reverend on the same lot. They alternated units without speaking. Bidders reported "whiplash," one folding under Ray and being talked back in under the Reverend for the same door. The error will not be repeated. Both said so, separately.',
    img: 'fork_feud' },
  { id: 'fork_dee_cobb', kind: 'flavor', town: 'bentFork',
    headline: 'SISTER DEE AND SLIM COBB BID ON THE SAME UNIT; TOWN ASKS WHAT DAY IT IS',
    body: 'It was Ray\'s day, which explains Cobb, and the unit had a walnut dresser up front, which explains Dee. Cobb won. Dee said "it\'ll be back," about the dresser, and was right within a week.',
    img: 'fork_schedule' },
  { id: 'marrow_lights', kind: 'flavor', town: 'marrowCreek',
    headline: 'THE LIGHTS OVER ROW C RETURN; COUNCIL VOTES TO "LEAVE THEM"',
    body: 'The lights came back Tuesday, hovered, and went. The council, which has no jurisdiction over the sky, voted to leave them alone. One member abstained, citing "a feeling."',
    img: 'marrow_creek' },
  { id: 'marrow_ferrell', kind: 'flavor', town: 'marrowCreek',
    headline: 'LOCAL MAN BUYS ORDINARY DRESSER, WEEPS',
    body: 'Cousin Ferrell won a unit on Row B containing a dresser, a lamp and a rug and nothing that looked back at him. He sat on the dresser for a while. "Normal," he said, to the rug. Wanda, watching, did not bid. She said the rug "had nothing in it."',
    img: 'marrow_normal' },
  { id: 'verm_grain', kind: 'flavor', town: 'vermillion',
    headline: 'SOCIETY PAGE: THE WORTHINGTONS\' TABLE WAS PINE ALL ALONG',
    body: 'The famous mahogany table at the center of forty years of dinner parties has been identified, by a guest with a loupe, as pine with a very good finish. The Worthingtons have canceled the season. The guest has not been invited back. The guest was right.',
    img: 'verm_finish' },
  { id: 'verm_appointment', kind: 'flavor', town: 'vermillion',
    headline: 'YARD LIMITS VIEWINGS TO TWO A DAY; THIRD DOOR "FOR THE BRAVE"',
    body: 'Citing "the wear on the doors," the Vermillion yard now allows each bidder two viewings by appointment. The third unit may be bid on blind. Regulars say the third unit is where the money is. Regulars would say that.',
    img: 'verm_engraved' },
  { id: 'kettle_wrap', kind: 'flavor', town: 'kettleBasin',
    headline: 'BUBBLE WRAP SHORTAGE HITS YARD; BIDDERS "USING TOWELS"',
    body: 'The office sold out of wrap on Tuesday after a bidder bought all of it "to be safe." Others have resorted to towels, sweaters, and in one case a wedding dress. The dress, the bidder notes, "was in the unit anyway."',
    img: 'kettle_van' },
  { id: 'kettle_garrity_no', kind: 'flavor', town: 'kettleBasin',
    headline: 'GARRITY DID NOT COME TUESDAY; ROW B SELLS CHEAP',
    body: 'The museum buyer\'s absence was noted at nine and priced in by ten. Every unit on Row B went for less than its shrink wrap suggested. "He knows something," said one bidder, about a man who was simply elsewhere.',
    img: 'kettle_gloves' },
  { id: 'chrome_valet', kind: 'flavor', town: 'chromeSprings',
    headline: 'VALET REFUSES TO PARK BIDDER\'S VAN; BIDDER PARKS IT ON THE FOUNTAIN',
    body: 'The van, described by the valet as "a van," was left with two wheels in the fountain after a disagreement about whether it should be parked at all. The bidder won two units. The valet has been reassigned to the east wing.',
    img: 'chrome_name' },
  { id: 'chrome_dex_two', kind: 'flavor', town: 'chromeSprings',
    headline: 'DEX MORDANT BUYS THE UNIT NEXT TO THE ONE HE MEANT TO',
    body: 'He was looking at his phone. The unit he bought contained, in his words, "a lot of really honest furniture." He has listed it online as a curated set. It has, somehow, sold.',
    img: 'chrome_dex' },
  { id: 'home_raccoon_two', kind: 'flavor', town: 'dustyFlats',
    headline: 'DEPOSITS THE RACCOON NOW HAS A KEY. NOBODY GAVE HIM A KEY.',
    body: 'The facility raccoon was seen at dawn carrying a small brass key across the lot with great purpose. Staff have checked every lock. All are accounted for. "It\'s not one of ours," said the clerk. "So whose is it."',
    img: 'raccoon_office' },
  { id: 'home_tower_letters', kind: 'flavor', town: 'dustyFlats',
    headline: 'WATER TOWER LOSES ANOTHER LETTER; NOW READS "DUS Y FLA"',
    body: 'The S fell Tuesday and was recovered by a child, who has declined to return it. The council has offered a reward of one letter. The tower is expected to read "DUS" by spring, which locals say "is fine, that\'s what we call it."',
    img: 'water_tower' },
  { id: 'mesa_overlook', kind: 'flavor', town: 'redMesa',
    headline: 'LEDGER CORRECTS ITSELF PRE-EMPTIVELY',
    body: 'In the interest of accuracy, this paper notes that something in tomorrow\'s edition will be wrong. We do not yet know what. We are confident. Readers who find it are asked to keep it to themselves, as we will.',
    img: 'gen_denies' },
  { id: 'mesa_vera_city', kind: 'flavor', town: 'redMesa',
    headline: 'VELVET VERA\'S "CITY BUYER" MAY BE VERA, SAYS SOURCE WHO IS TUCK',
    body: 'A source who nodded when asked and nodded again when asked to confirm suggests the buyer who "pays double in the city" is a warehouse Vera owns. Vera, reached at the yard, said "darling" and nothing else. The Ledger prints this as it received it.',
    img: 'gen_seance' },

  // ---------- general news, any town (photos shared) ----------
  { id: 'gen_parrot_two', kind: 'flavor',
    headline: 'LOST PARROT FOUND; PARROT DISPUTES "LOST"',
    body: 'The bird, missing since March, was located on the roof of the storage office where it has apparently lived the whole time. It has learned the auctioneer\'s chant. It does the numbers wrong. Bidders have twice raised on the parrot.',
    img: 'lost_parrot' },
  { id: 'gen_smell_two', kind: 'flavor',
    headline: 'MYSTERY SMELL TRACED TO ROW B, THEN ROW C, THEN NOWHERE',
    body: 'The county sent a man with a meter. The meter read "fine." The man said it was not fine. The smell, described as "warm pennies," moved while he stood there. He has asked not to come back.',
    img: 'mystery_smell' },
  { id: 'gen_ghost_two', kind: 'flavor',
    headline: 'NIGHT GUARD REPORTS A LIGHT IN A UNIT WITH NO POWER',
    body: 'The light was "reading-lamp yellow" and went out when he knocked. Management has checked the unit. It contains a lamp, unplugged, and a chair facing the door. Management has not sat in the chair.',
    img: 'ghost_unit' },
  { id: 'gen_bart_two', kind: 'flavor',
    headline: 'BIG BART BUYS THE DINER\'S PIE CASE, LEAVES THE PIES',
    body: 'The case, a 1958 chrome unit, was bought for "a number Roy will not repeat." The pies were returned to the counter in a box. Bart ate one on the way out. He did not pay for the pie. Roy did not ask.',
    img: 'bart_profile' },
  { id: 'gen_ed_two', kind: 'flavor',
    headline: 'ED\'S NOTEBOOK FOUND, RETURNED, "NOT THE REAL ONE"',
    body: 'A notebook full of numbers was handed in at the office and collected by Ed within the hour. Asked whether it was the notebook, he said "a notebook," and the office believes there are several, and that the real one has never been seen.',
    img: 'ed_notebook' },
  { id: 'gen_sal_two', kind: 'flavor',
    headline: 'SPITE SAL WINS UNIT, DISCOVERS IT IS HIS OWN OLD STORAGE',
    body: 'The unit, delinquent since a bad year, contained a lawn mower, two chairs and a box marked SAL. He bid on principle. He won on principle. He has, sources say, "no plans to open the box."',
    img: 'sal_banned' },
  { id: 'gen_dutch_two', kind: 'flavor',
    headline: 'DUTCH ASKED TO "USE HIS INSIDE VOICE" AT FUNERAL; COMPLIES, BRIEFLY',
    body: 'The service for a longtime bidder proceeded quietly until the casket was lowered, at which point Dutch said the one thing he says, at volume, once. Mourners describe it as "exactly right." The family has asked him to do it again next year.',
    img: 'yiip_dutch' },
  { id: 'gen_motel_two', kind: 'flavor',
    headline: 'MOTEL ON ROUTE 9 CHANGES NAME AGAIN; SIGN NOW READS "MOTEL"',
    body: 'The Hearts Motel, formerly the Starlite, formerly the Hearts, has removed all but one word from its sign "to save on bulbs." The vacancy light works. It has always worked. That was never the issue.',
    img: 'motel_hearts' },
  { id: 'gen_church_two', kind: 'flavor',
    headline: 'HOT TUB CHURCH ADDS SECOND TUB; ATTENDANCE "STEAMY"',
    body: 'The congregation that meets in a converted hot tub showroom has added a second tub for overflow. The pastor reports baptisms are up. The pastor reports everything is up. The water bill is also up.',
    img: 'hot_tub_church' },
  { id: 'gen_road_two', kind: 'flavor',
    headline: 'HIGHWAY DEPARTMENT MOVES MILE MARKER; TOWN NOW ONE MILE CLOSER TO EVERYWHERE',
    body: 'The marker was found to be wrong by a surveyor with time on his hands. Gas costs, the yard notes, are unchanged. "The miles are the same," said the clerk. "The number is different. This is a newspaper. You know about that."',
    img: 'road_town' },
  { id: 'gen_layoffs_two', kind: 'flavor',
    headline: 'OFFICE THAT FOLDED LAST YEAR REOPENS AS OFFICE THAT SELLS OFFICES',
    body: 'The same desks, the same chairs, the same filing cabinets, now for sale in the same room they were used in. "It\'s a showroom," said the owner. "It was always a showroom. We just didn\'t know."',
    img: 'office_layoffs' },
  { id: 'gen_romance_two', kind: 'flavor',
    headline: 'LIBRARY ROMANCE SECTION NOW LARGER THAN LIBRARY',
    body: 'Donations from a storage unit have doubled the collection. The librarian has moved reference "to the hall." Patrons report the new books are "well thumbed" and in one case "signed by the author, to somebody named Dolores, with regret."',
    img: 'romance_section' },
  { id: 'gen_bachelorette_two', kind: 'flavor',
    headline: 'BACHELORETTE PARTY BIDS ON UNIT AS A DARE, WINS, KEEPS IT',
    body: 'The party of nine outbid Spite Sal for a 5x5 "for the story." The unit contained a wedding dress. The bride wore it. The wedding is Saturday. Sal has been invited and has said he will attend "to see if it fits."',
    img: 'bachelorette' },
  { id: 'gen_heat_two', kind: 'flavor',
    headline: 'HEAT ADVISORY: AUCTIONEER WILL "NOT SLOW DOWN, BUT MIGHT SIT"',
    body: 'A chair has been provided. He has not used it. Bidders are advised that the chant does not get slower in the heat; it gets shorter, which the regulars say is worse. Water is at the office. Ice is at the diner. Shade is nowhere.',
    img: 'heat_record' },
  { id: 'gen_tower_two', kind: 'flavor',
    headline: 'CHILD RETURNS WATER TOWER LETTER, DEMANDS "A DIFFERENT ONE"',
    body: 'The S is back. The child now wants the D, "because it\'s bigger." The council is considering it. The council considers most things. The tower, for now, reads correctly, which nobody can get used to.',
    img: 'water_tower' },
  { id: 'gen_pie_two', kind: 'flavor',
    headline: 'ROY\'S DINER PIE DECLARED "HISTORIC"; ROY DECLINES PLAQUE',
    body: 'The county wanted to mark the pie case. Roy said the pie "is not historic, it\'s Tuesday\'s." The plaque was installed anyway, in the parking lot, where it marks a spot near the pie. Roy has parked on it.',
    img: 'diner_pie' },
  { id: 'gen_office_folded_two', kind: 'flavor',
    headline: 'YARD OFFICE INSTALLS SUGGESTION BOX; FIRST SUGGESTION IS A KEY',
    body: 'The box was opened Monday. Inside: a small brass key and a note reading "you know." The office does not know. The key fits nothing in the office. The clerk has put it on a nail and looks at it sometimes.',
    img: 'office_folded' },
  { id: 'gen_raccoon_three', kind: 'flavor',
    headline: 'DEPOSITS THE RACCOON PLACES A BID; IT IS DISALLOWED',
    body: 'The facility raccoon raised a paw during the bidding on a 10x10. The auctioneer, who has called auctions for thirty years, hesitated. The bid was disallowed on the grounds that the raccoon has no bidder number. The raccoon has since been seen near the office, where numbers are sold.',
    img: 'raccoon_office' },

  // ---------- a third voice per town ----------
  { id: 'salt_pruitt_bev', kind: 'flavor', town: 'saltLick',
    headline: 'PRUITT AND BEV BID ON THE SAME UNIT; "IT WAS HEAVY AND IT WAS BOXES"',
    body: 'A rare overlap. The unit was full of boxes and the boxes were full of iron. Bev wanted the boxes. Pruitt wanted the iron. They split it in the lot with a handshake and a scale. Both say they won.',
    img: 'salt_scale' },
  { id: 'gyp_layout', kind: 'flavor', town: 'gypsumCity',
    headline: 'EDITOR GIVEN A MAP OF THE YARD. EDITOR FRAMES IT. DOES NOT READ IT.',
    body: 'The clerk hand-drew every row and number for the Correction office. It now hangs above the editor\'s desk, where he calls it "handsome." Yesterday\'s front page named a unit that is on the map. It was not the unit in the story.',
    img: 'gyp_correction' },
  { id: 'fork_chalk', kind: 'flavor', town: 'bentFork',
    headline: 'YARD BOARD ERASED OVERNIGHT; BOTH AUCTIONEERS DENY IT, SEPARATELY',
    body: 'Somebody wiped tomorrow\'s name off the board. Ray says it was the Reverend. The Reverend says it was "weather." It was not weather. The board was rewritten at dawn, in a third handwriting nobody recognizes.',
    img: 'fork_schedule' },
  { id: 'marrow_couch_two', kind: 'flavor', town: 'marrowCreek',
    headline: 'THE NORMAL COUCH HAS BEEN SOLD. THE YARD IS "WORSE WITHOUT IT."',
    body: 'Cousin Ferrell paid twice its value and carried it out himself. Regulars report the row feels "wrong" now, "like a mouth with the one good tooth out." Wanda has not commented. Wanda smiled.',
    img: 'marrow_normal' },
  { id: 'verm_charlie_loupe', kind: 'flavor', town: 'vermillion',
    headline: 'CHROME CHARLIE BUYS A LOUPE, LOOKS THROUGH THE WRONG END',
    body: 'Charlie was seen at the yard with a jeweler\'s loupe held backwards, declaring a dresser "definitely huge." Vale, nearby, said nothing for a long time and then said "yes, Charles." It was the kindest thing he has said all year.',
    img: 'verm_loupe' },
  { id: 'kettle_seventy', kind: 'flavor', town: 'kettleBasin',
    headline: 'THERMOSTAT READS SEVENTY-ONE FOR SIX MINUTES; INQUIRY LAUNCHED',
    body: 'The six minutes have been reconstructed from three witnesses and a hygrometer. Nothing in the units was harmed. Priscilla has requested the minutes be published. They are: 3:04 to 3:10. She has framed them.',
    img: 'kettle_thermostat' },
  { id: 'chrome_baroness_van', kind: 'flavor', town: 'chromeSprings',
    headline: 'THE BARONESS ASKED WHOSE VAN THAT WAS. THE CLERK KNEW.',
    body: 'It is the first time the Baroness has asked about a bidder. It is also the first time the clerk has answered a question about a bidder without checking the ledger. The bidder was not informed. The bidder will read this.',
    img: 'chrome_baroness' },
  { id: 'mesa_tuck_word', kind: 'flavor', town: 'redMesa',
    headline: 'TUCK SPEAKS; LEDGER PRINTS THE WORD IN FULL',
    body: 'The word was "no." It was directed at Vera, about a unit, and it settled the matter. Witnesses describe the moment as "like a church bell." Tuck has not spoken since. He nodded at this reporter, which we take as consent.',
    img: 'gen_seance' },
  { id: 'home_ed_tab', kind: 'flavor', town: 'dustyFlats',
    headline: 'ED PAYS HIS DINER TAB TO THE PENNY, INCLUDING A PENNY FROM 1988',
    body: 'The tab, kept in the notebook since spring, came to forty-one dollars and six cents. Ed paid it in exact change and asked for a receipt. Roy gave him one. Ed underlined it.',
    img: 'ed_notebook' },

  // ---------- the world gets stranger the longer you stay (day-gated, photos reused) ----------
  { id: 'late_moonrock', kind: 'flavor', minDay: 20,
    headline: 'LOCAL MAN INSISTS MOON ROCK IS "BACK IN TOWN"',
    body: 'He would not say how he knows. He would not say where. He held up a drawer, empty, "for scale." The paper prints this because he has been right before, about the weather, once.',
    img: 'moon_rock' },
  { id: 'late_unit13', kind: 'flavor', minDay: 30,
    headline: 'UNIT 13 DENIES ALLEGATIONS',
    body: 'A statement was found taped to the door of unit 13 this morning, typed, unsigned, denying "everything." Management has confirmed nobody rents unit 13. Management has confirmed nobody has rented unit 13 in some time.',
    img: 'ghost_unit' },
  { id: 'late_frontpage', kind: 'flavor', minDay: 45,
    headline: 'EDITOR\'S NOTE: WE DID NOT PRINT YESTERDAY\'S FRONT PAGE',
    body: 'Readers who received a front page yesterday are asked to describe it to the office. The office did not produce one. The press was cold. The story on it, several readers report, was accurate.',
    img: 'gen_denies' },
  { id: 'late_chant', kind: 'flavor', minDay: 25,
    headline: 'AUCTIONEER SAYS A NUMBER THAT DOES NOT EXIST; SALE STANDS',
    body: 'Mid-chant, between four-fifty and five hundred, the auctioneer said a number nobody could repeat afterward. The bidder who nodded at it won. The clerk wrote down "475?" and has left the question mark.',
    img: 'heat_record' },
  { id: 'late_paperboy', kind: 'flavor', minDay: 35,
    headline: 'PAPER DELIVERED TO A UNIT. NOBODY ORDERED IT. NOBODY LIVES THERE.',
    body: 'The paperboy insists the address was on his route. The route does not include the storage yard. The paper, this paper, was found inside the unit, on a chair, folded to the auction listings. The unit had been locked for a year.',
    img: 'ghost_unit' },
  { id: 'late_ed_number', kind: 'flavor', minDay: 40,
    headline: 'ED\'S NUMBER FOR A UNIT WAS EXACTLY RIGHT. TO THE DOLLAR. HE IS "UNSETTLED."',
    body: 'The unit was appraised at home by its buyer at one thousand one hundred and forty dollars. Ed\'s notebook, the buyer later learned, said the same. Ed, told this, closed the notebook and did not open it for the rest of the day. "Close is the job," he said. "Exact is something else."',
    img: 'ed_notebook' },
  { id: 'late_raccoon', kind: 'flavor', minDay: 60,
    headline: 'RACCOON SEEN WITH BIDDER NUMBER; OFFICE "LOOKING INTO IT"',
    body: 'Deposits, the facility raccoon, was photographed at the peek holding a laminated card. Staff say it is not one of theirs. Staff say it is a very good laminate. He did not bid. He looked, the clerk said, "like he was thinking about it."',
    img: 'raccoon_office' },

  // ---------- flavor ----------
  { id: 'raccoon_office', kind: 'flavor',
    headline: 'RACCOON ELECTED HONORARY FACILITY MANAGER',
    body: 'The raccoon, known locally as "Deposits," has lived above the storage office for three years and has seniority, staff argue. He was given a small vest.',
    img: 'raccoon_office' },
  { id: 'heat_record', kind: 'flavor',
    headline: 'HEAT BREAKS RECORD; AUCTIONEER BREAKS SWEAT',
    body: 'Bidders are advised to bring water, hats, and realistic expectations. The auctioneer will not slow down. He never has.',
    img: 'heat_record' },
  { id: 'water_tower', kind: 'flavor',
    headline: 'WATER TOWER REPAINT DELAYED AN ELEVENTH YEAR',
    body: 'The town council has again voted to "leave it rustic." The tower still reads DUS Y FLA S, which everyone secretly prefers.',
    img: 'water_tower' },
  { id: 'diner_pie', kind: 'flavor',
    headline: 'ROY\'S DINER BRINGS BACK THE AUCTION-DAY PIE',
    body: 'Half price for anyone holding a bidder number. "Losers eat free if they cry a little," Roy added, unprompted.',
    img: 'diner_pie' },
  { id: 'lost_parrot', kind: 'flavor',
    headline: 'LOST PARROT KNOWS TOO MUCH, OWNER ADMITS',
    body: 'The bird, missing since Tuesday, is said to repeat storage gate codes it has overheard. If found, please return it and do not listen to it.',
    img: 'lost_parrot' },
  { id: 'mystery_smell', kind: 'flavor',
    headline: 'THE SMELL ON ROW C HAS BEEN IDENTIFIED',
    body: 'It was cheese. A wheel of it, aged nine years in a unit with no climate control. The buyer has been informed. The buyer has stopped answering calls.',
    img: 'mystery_smell' },
  { id: 'ghost_unit', kind: 'flavor',
    headline: 'STAFF INSIST UNIT 13 "SORTS ITSELF" AT NIGHT',
    body: 'Boxes stacked by morning, neater than any tenant left them. Management has raised the rent on it, citing "included services."',
    img: 'ghost_unit' },
  { id: 'bart_profile', kind: 'flavor',
    headline: 'BIG BART BUYS NINTH LOCKER THIS MONTH',
    body: '"It\'s groceries to me," the deep-pocketed bidder said, tipping his hat to nobody in particular. Rivals report feelings of financial inadequacy.',
    img: 'bart_profile' },
  { id: 'ed_notebook', kind: 'flavor',
    headline: 'WHAT IS IN EAGLE ED\'S NOTEBOOK?',
    body: 'The quiet bidder\'s little book has been the subject of speculation for years. A waitress who glimpsed a page reports "numbers, and a small drawing of a wardrobe."',
    img: 'ed_notebook' },
  { id: 'sal_banned', kind: 'flavor',
    headline: 'SPITE SAL BANNED FROM BAKE SALE FOR BIDDING WAR',
    body: 'Witnesses say Sal drove the price of a lemon cake to $140 out of pure malice, then didn\'t eat it. "He just watched it," said one shaken volunteer.',
    img: 'sal_banned' },
  { id: 'road_town', kind: 'flavor',
    headline: 'RUMORS OF RICHER TOWNS DOWN THE HIGHWAY',
    body: 'Travelers speak of towns where the lockers hold velvet and chrome, and of stranger places below and beyond. The highway is long. Save your gas money.',
    img: 'road_town' },
  { id: 'yiip_dutch', kind: 'flavor',
    headline: 'NEW BIDDER IN TOWN CAN BE HEARD FROM ROW F',
    body: 'He says one word and he says it loud. Locals have started setting their watches by it. Earplugs available at the office, 50 cents.',
    img: 'yiip_dutch' },

  { id: 'office_folded', kind: 'arch_hint', arch: 'officeSurplus',
    headline: 'REGIONAL COMPANY FOLDS OVERNIGHT, OFFICE VANISHES',
    body: 'Twelve desks, the good chair, and the breakroom microwave — all of it moved into {unit} the night before the auditors arrived. Sold as one lot today.',
    img: 'office_folded' },
  { id: 'office_layoffs', kind: 'arch_hint', arch: 'officeSurplus',
    headline: 'EX-EMPLOYEES INVITED TO "BUY YOUR OWN STAPLER BACK"',
    body: 'The entire office of a defunct firm goes under the hammer today in {unit}. Former staff plan to attend. Some to bid, most to boo.',
    img: 'office_layoffs' },

  // ---------- more town flavor (cheekier) ----------
  { id: 'motel_hearts', kind: 'flavor',
    headline: 'MOTEL SIX-AND-A-HALF ASKS GUESTS TO STOP STEALING ROBES',
    body: 'Management notes the robes say PROPERTY OF THE MOTEL in letters "frankly enormous." A local storage unit was recently found to contain forty-one of them.',
    img: 'motel_hearts' },
  { id: 'bachelorette', kind: 'flavor',
    headline: 'BACHELORETTE PARTY MISTAKES AUCTION FOR MALE REVUE',
    body: 'The confusion lasted "longer than you\'d think," per witnesses, largely due to the auctioneer\'s confidence. The party stayed, bid on a locker, and won it.',
    img: 'bachelorette' },
  { id: 'hot_tub_church', kind: 'flavor',
    headline: 'CHURCH RAFFLES OFF HOT TUB, IMMEDIATELY REGRETS IT',
    body: 'The winner, a local massage therapist, has installed it "visibly." The congregation has voted to raffle only casseroles going forward.',
    img: 'hot_tub_church' },
  { id: 'romance_section', kind: 'flavor',
    headline: 'LIBRARY MOVES ROMANCE SECTION AFTER "INCIDENTS"',
    body: 'The books now live behind the counter, where patrons must ask for them by name and maintain eye contact. Circulation has tripled.',
    img: 'romance_section' },

  // ---------- classifieds / ads ----------
  { id: 'ad_locksmith_flat', kind: 'ad', body: 'LOCKSMITH — WE CRACK ANYTHING. $60 flat. No questions. Some judgment.' },
  { id: 'ad_oddjobs', kind: 'ad', body: 'ODD JOBS WANTED — strong back, sunny disposition. $60/half day. Ask at the yard.' },
  { id: 'ad_petes', kind: 'ad', body: 'PETE\'S PAWN — cash for ANYTHING. Yes, anything. Stop asking, start selling.' },
  { id: 'ad_roys', kind: 'ad', body: 'ROY\'S DINER — cold drinks, hot pie, free advice you didn\'t ask for.' },
  { id: 'ad_vans', kind: 'ad', body: 'BIG VANS COMING SOON — Dusty Flats Motors. Haul more junk per trip. Inquire within.' },
  { id: 'ad_scrap', kind: 'ad', body: 'SCRAPYARD pays $2 per bulk. It\'s not much. It\'s not supposed to be.' },
  { id: 'ad_flashlights', kind: 'ad', body: 'FLASHLIGHTS, MIRRORS, METAL DETECTORS — tools of the trade, arriving at the general store soon.' },
  { id: 'ad_lost_key', kind: 'ad', body: 'FOUND: one strange key, cold to the touch. Claim at office. Please claim it. Please.' },
  { id: 'ad_museum', kind: 'ad', body: 'DUSTY FLATS MUSEUM seeks donations of "anything actually good for once."' },
  { id: 'ad_earplugs', kind: 'ad', body: 'EARPLUGS — 50 cents at the office. You know why.' },
];

// ================= procedural town news =================
// Combinatorial mad-libs: thousands of unique stories, no repeats.
// Each template has an img id, so ONE illustration covers every fill of it.
const NP_FOLK = ['Earl', 'Dot', 'Marlene', 'Bucky', 'Reverend Tim', 'Big Denise', 'Junior', 'Coach', 'Aunt Pearl', 'Dwayne', 'Little Bucky', 'Deputy Kyle', 'Mrs. Fenn', 'Old Tom', 'Rosalind', 'the Hobart twins',
  'Miss Patty', 'Old Gus', 'Tina', 'Roy Jr.', 'Deputy Kyle', 'Grandma Lou', 'Sweaty Pete', 'Doreen',
  'Chip', 'Lurlene', 'Half-Price Hank', 'Bev', 'The Kowalski Twins', 'Mayor Fudd'];
const NP_JOBS = ['taxidermist', 'wig salesman', 'pool cleaner', 'notary', 'llama farmer', 'wedding DJ', 'substitute organist', 'well digger', 'crop duster', 'bingo caller', 'dog groomer', 'sign painter', 'part-time coroner',
  'mattress inspector', 'sign spinner', 'beekeeper', 'pie judge', 'tow truck operator', 'palm reader',
  'hot tub repairman', 'crossing guard', 'karaoke champion', 'scrap hauler', 'bingo caller', 'line dancer',
  'amateur magician', 'substitute barber'];
const NP_THINGS = ['a taxidermied raccoon', 'an inflatable hot tub', 'forty pounds of jerky', 'a ceremonial gavel', 'a jar of somebody\'s teeth', 'a church pew', 'the good ladder', 'a mannequin in a wedding dress', 'a crate marked ROTATE', 'nine identical lamps', 'a very small safe',
  'a mannequin in a police uniform', "someone's dentures", 'a neon OPEN sign', 'a wedding dress',
  'a crate of expired fireworks', 'two bowling trophies', 'an urn labeled "GARY"', 'a fog machine',
  'a waterbed, still full', 'eleven identical toasters', 'a karaoke machine with one song on it',
  'a garden gnome the size of a man', 'a chandelier made of antlers'];
const NP_PLACES = ["ROY'S DINER", 'the bingo hall', 'the water tower', 'the scrapyard', 'the motel pool',
  'the church picnic', 'the gas station', 'the storage yard', 'the laundromat', 'the funeral parlor',
  'the mini-golf course', 'the truck stop'];
const NP_INCIDENTS = [
  { img: 'gen_lost', h: '{who} LOSES {thing} AT {place}, OFFERS REWARD OF {thing2}',
    b: 'The local {job} last saw it "right there" and then did not. Anyone returning it to {place} will receive {n} dollars and, they say, "a lifetime of gratitude, which is worth more, please."' },
  { img: 'gen_fight', h: '{who} AND {who2} SETTLE IT AT {place}',
    b: 'The dispute, which began over {thing} in {n}, ended Tuesday with handshakes, one apology, and {who2} keeping the {thing}. Witnesses describe the handshake as "long."' },
  { img: 'gen_stolen', h: '{who} REPORTS {thing} STOLEN, FINDS IT, DOES NOT UPDATE THE REPORT',
    b: 'The {job} filed a report at {place} on Monday and located the item Tuesday "where I left it." The sheriff has been told. The sheriff has been told several times about several things.' },
  { img: 'gen_record', h: '{who} SETS COUNTY RECORD: {n} {thing2}',
    b: 'The record, set at {place} before a crowd of {n}, stands until {who2} "gets a good night\'s sleep," according to {who2}. The previous record holder, a {job}, has asked not to be named.' },
  { img: 'gen_hotdog', h: '{place} TO SERVE {thing} "FOR A LIMITED TIME"',
    b: 'The limited time, management confirms, is "until it\'s gone or somebody complains." {who}, a regular, has already complained and already ordered two.' },
  { img: 'gen_mayor', h: 'MAYOR FORGETS NAME OF {place}, SUGGESTS "{thing}"',
    b: 'Addressing the council, the mayor referred to the landmark as "the, uh, {thing} place." The motion to rename it passed. {who}, a {job}, voted twice.' },
  { img: 'gen_wedding', h: '{who} AND {who2} TO WED AT {place}; {thing} TO BE BEST MAN',
    b: 'The couple met over {thing} at {place} in {n} and have, friends say, "never once agreed about it." The ceremony is Saturday. The {job} will officiate. The reception is wherever {who} can park.' },
  { img: 'gen_seance', h: 'SEANCE AT {place} REACHES {who2}, WHO IS ALIVE',
    b: '{who}, a {job}, attempted to contact "the other side" and reached {who2}, who was at home. "They asked about {thing}," {who2} said. "I told them it\'s in the garage. It\'s been in the garage."' },
  { img: 'gen_ufo', h: '{who} PHOTOGRAPHS LIGHTS OVER {place}; PHOTO IS OF {thing}',
    b: 'The image, submitted to this paper with great confidence, shows {thing} in a kitchen. {who}, a {job}, maintains the lights "were there" and that the camera "is a coward."' },
  { img: 'gen_sunbather', h: '{who} SUNBATHES ON {place} FOR {n}TH YEAR; COUNCIL "USED TO IT"',
    b: 'The annual sunbathing, which began as a protest over {thing}, continues after the thing was resolved in {n}. Asked why, the {job} said it was "nice up there." The council has installed a railing.' },
  { img: 'gen_denies', h: '{who} DENIES EVERYTHING',
    b: 'The local {job} was seen leaving {place} at {n} a.m. carrying {thing}. "That could be anybody," they said, still holding it.' },
  { img: 'gen_banned', h: '{who} BANNED FROM {place} — AGAIN',
    b: 'Management cited "the incident with {thing}." {who}, a {job} by trade, has vowed to appeal, loudly, from the parking lot.' },
  { img: 'gen_triangle', h: 'LOVE TRIANGLE AT {place} TURNS UGLY',
    b: '{who} and {who2} were reportedly courting the same {job}. Witnesses describe "a lot of shoving" and one thrown {thing}.' },
  { img: 'gen_jackpot', h: '{who} WINS ${n}00 AT BINGO, LOSES IT BY NOON',
    b: 'The {job} celebrated by attempting to buy {thing} at auction. It went poorly. The bingo hall sends its condolences.' },
  { img: 'gen_stolen', h: 'POLICE LOG: SOMEBODY STOLE {thing}',
    b: 'Deputy Kyle reports the item vanished from {place} overnight. "Honestly, keep it," said the owner, a retired {job}.' },
  { img: 'gen_kissing', h: '{who} SEEN KISSING SOMEBODY BEHIND {place}',
    b: 'Sources could not identify the other party. {who} says it was "a private matter," "nobody\'s business," and also "fake news."' },
  { img: 'gen_sunbather', h: 'ROOFTOP SUNBATHER TURNS OUT TO BE {who}',
    b: '"It\'s my roof," argued the {job}. Neighbors have purchased curtains, and one has purchased binoculars, which is its own story.' },
  { img: 'gen_wedding', h: 'WEDDING AT {place} CALLED OFF AT LAST MINUTE',
    b: 'The groom, a {job}, reportedly fled with {thing}. The reception went ahead anyway. "The deposit was non-refundable," said the bride, dancing.' },
  { img: 'gen_record', h: '{who} ATTEMPTS RECORD FOR MOST {thing2}',
    b: 'The attempt at {place} ended after {n} hours when the {job} "got a cramp somewhere personal." A rematch is scheduled.' },
  { img: 'gen_seance', h: 'SEANCE AT {place} CONTACTS WRONG GUY',
    b: '{who} intended to reach a late aunt but instead reached "some fella named Gary, very chatty." The urn community declined comment.' },
  { img: 'gen_diet', h: '{who} SWEARS OFF {place} FOR GOOD',
    b: 'The vow lasted {n} hours. "I have a system," explained the {job}, ordering the usual.' },
  { img: 'gen_fight', h: 'FIGHT OVER {thing} SETTLED WITH ARM WRESTLING',
    b: 'The dispute between {who} and {who2} drew a crowd at {place}. Both parties claim victory. The {thing2} remains unclaimed.' },
  { img: 'gen_lost', h: 'LOST: {thing}. REWARD: RESPECT',
    b: '{who} says it was last seen near {place} and holds "sentimental and possibly legal value." No questions will be answered.' },
  { img: 'gen_mayor', h: 'MAYOR FUDD PROPOSES STATUE OF HIMSELF',
    b: 'The proposal, his {n}th, was voted down at {place}. "One day," said the mayor, gazing at nothing. The town agrees: one day he\'ll stop.' },
  { img: 'gen_hotdog', h: '{place} UNVEILS NEW MENU ITEM, TOWN DIVIDED',
    b: 'Half the town calls it "brave." {who}, a {job}, ate four and had to sit down in the shade. Reviews are mixed but attendance is up.' },
  { img: 'gen_ufo', h: 'LIGHTS OVER THE DESERT "PROBABLY NOTHING," SAYS EVERYONE, NERVOUSLY',
    b: '{who} reports the lights hovered near {place} for {n} minutes and then "just left, rude." Officials suggest weather. The weather declines credit.' },
];
const NP_THINGS2 = ['toasters balanced on one arm', 'pies eaten blindfolded', 'consecutive yodels', 'storage units bid on without looking', 'hours spent staring at one door', 'raccoons fed from one hand', 'lawn chairs carried at once',
  'garden gnomes stacked', 'laps around the water tower', 'bingo cards played at once'];
const NP_AD_TEMPLATES = [
  '{who} IS NOT SPEAKING TO {who2}. Notice placed by {who2}.',
  'LOST near {place}: {thing}. Sentimental value. Also actual value. Ask for {who}.',
  '{job} SEEKS APPRENTICE. Must own truck. Must not ask about {thing}.',
  'FOR SALE: {thing}. Reason for selling: {who2}.',
  '{thing} FOR SALE — barely haunted. Best offer.',
  'WILL TRADE {thing} for anything with wheels. Ask for {who}.',
  '{job} AVAILABLE for parties, funerals, jury duty. Rates negotiable.',
  'FREE TO GOOD HOME: {thing}. To any home, actually. Please.',
  'LESSONS: learn to be a {job} in six weeks. Results not typical or promised.',
  'MISSED CONNECTION: you bid on the locker. I bid louder. Coffee sometime?',
];

function genFlavorStory(R) {
  const inc = R.pick(NP_INCIDENTS);
  const who = R.pick(NP_FOLK);
  let who2 = R.pick(NP_FOLK);
  if (who2 === who) who2 = R.pick(NP_FOLK);
  const fill = (s) => s
    .replace(/{who2}/g, who2).replace(/{who}/g, who)
    .replace(/{job}/g, R.pick(NP_JOBS)).replace(/{thing2}/g, R.pick(NP_THINGS2))
    .replace(/{thing}/g, R.pick(NP_THINGS)).replace(/{place}/g, R.pick(TOWN_PLACES[_paperTownId] || NP_PLACES))
    .replace(/{n}/g, String(R.i(2, 14)));
  return { story: { id: 'gen', kind: 'flavor', headline: fill(inc.h), img: inc.img }, text: fill(inc.b), unitKnown: false };
}
function genAd(R) {
  const who = R.pick(NP_FOLK);
  let who2 = R.pick(NP_FOLK);
  if (who2 === who) who2 = R.pick(NP_FOLK);
  const body = R.pick(NP_AD_TEMPLATES)
    .replace(/{thing}/g, R.pick(NP_THINGS).toUpperCase())
    .replace(/{job}/g, R.pick(NP_JOBS)).replace(/{who2}/g, who2).replace(/{who}/g, who)
    .replace(/{place}/g, R.pick(TOWN_PLACES[_paperTownId] || NP_PLACES));
  return { id: 'gen_ad', kind: 'ad', body };
}

// every image id the paper might use (for the loader). Many stories share a photo on
// purpose (the same nugget shot backs both the legend and its debunking) — dedupe so
// each file is only ever asked for, loaded, checked and listed once.
const NP_IMAGE_IDS = Array.from(new Set(
  STORIES.filter((s) => s.img).map((s) => s.img)
    .concat(Object.keys(PAPER_CALLBACKS).map((k) => PAPER_CALLBACKS[k].img))   // the callbacks' photos (memory.js)
    .concat(Object.keys(PROVENANCE).map((k) => PROVENANCE[k].paper.img))       // the provenance chapters (lockerstories.js)
    .concat(['yard_sale'])                                                      // the yard's own story (ending.js)
    .concat(['fs_clerk', 'fs_locksmith', 'fs_society', 'fs_photo'])            // the foreshadow photos
    .concat(NP_INCIDENTS.map((i) => i.img))
));

// ---- each town's paper has its own voice: its own places, its own column label, its own briefs ----
const TOWN_PLACES = {
  saltLick: ['the feed store scale', 'the lick rock', 'the Shopper office', 'Row C', "Pruitt's lot", 'the salt flats'],
  redMesa: ['the Silver Dollar', 'the mesa road', 'the Ledger office', 'the overlook', 'the old fire station'],
  gypsumCity: ['the Correction office', 'the courthouse steps', 'the newsstand', 'the repainted row', 'the survey marker'],
  bentFork: ['the bent fork', "Ray's podium", "the Reverend's awning", 'the yard board', 'the river bridge'],
  marrowCreek: ['the dry creek', 'Fenn Street', 'unit 13', "Voss Taxidermy", 'the fog line', "Carl's second house"],
  vermillion: ['Rue Street', 'the gala tent', 'the engraver\'s', 'the velvet rope', 'the chrome lot'],
  kettleBasin: ['the thermostat', 'the humidity gauge', 'Route 9', 'the loading dock', 'the museum van'],
  chromeSprings: ['Pierce Avenue', 'the fountain', 'the marble office', 'the east wing', 'the valet stand'],
};
const PAPER_KICKER = {
  dustyFlats: 'AROUND TOWN', saltLick: 'ROADSIDE', redMesa: 'AS FAR AS WE KNOW', gypsumCity: 'CORRECTIONS PENDING',
  bentFork: 'FROM BOTH SIDES', marrowCreek: 'WE HEARD', vermillion: 'SOCIETY', kettleBasin: 'CONDITIONS', chromeSprings: 'DISCREETLY',
};
// briefs: one-line items at the foot of the page, in the paper's own voice
const TOWN_BRIEFS = {
  dustyFlats: ['Deposits the raccoon was seen carrying a small wrench. Purpose unknown.', 'The water tower will be repainted "eventually," council confirms.',
    "Roy's Diner pie of the week is the same pie. Nobody minds.", 'A lawn chair was left at the yard. It has been there four days. It is comfortable.',
    'Somebody keeps feeding the raccoon. Somebody knows who they are.', 'Ed was seen buying a second notebook. The first is not full. He is "planning."',
    'Sal has been banned from the diner counter, not the diner. He sits in a booth and stares at the counter.', 'Bart\'s truck has been washed. This has not happened before. Something is coming.'],
  saltLick: ['The scale at the feed store still reads heavy. Pruitt still uses it.', 'Free salt behind the yard. Bring your own lick. This is the whole notice.',
    'Bev has counted her boxes again. The number went up.', 'Row C moved another inch east in the wind. The manager has stopped measuring.',
    'A coupon in last week\'s Shopper was for a store in another town. It was honored anyway.',
    'The lick rock has a new lick mark, higher than a cow can reach. The Shopper is not asking.', 'Pruitt weighed a box of Bev\'s. Bev has not spoken to him since. That was Tuesday.',
    'The Shopper is free. The Shopper is also, this week, late. Both are true.'],
  redMesa: ['The Ledger stands by Tuesday\'s unit number, mostly.', 'Vera was seen with a city buyer. Or a city buyer was seen with Vera.',
    'Tuck said a word on Thursday. Witnesses disagree on which.', 'The overlook is closed for "reasons." The reasons are goats.',
    'A locksmith from out of town asked directions to the yard. He was given three.',
    'The Ledger has verified one fact this week. It is on page four. It is about weather.', 'The Silver Dollar\'s foundation has been fenced. Somebody keeps leaving guitar picks on it.',
    'Vera\'s car was seen at the yard at dawn. Vera does not do dawn. Something is worth it.'],
  gypsumCity: ['CORRECTION: the unit named on page one exists. The number was, again, a number.', 'The editor has been asked to learn the row layout. The editor has declined, politely.',
    'Hattie has requested a subscription to a second copy "for accuracy." Granted.', 'Delgado returned his paper. He kept the doors.',
    'The Correction regrets an error in yesterday\'s corrections. Details on page two, allegedly.',
    'The yard has offered to print the row numbers on the front page for us. We have offered to print theirs.', 'A reader matched three stories to three doors in one week. She has been offered a job. She has declined it, correctly.',
    'The watchmaker\'s unit was on the row Tuesday. It was not the number we printed. It was, we note, a number.'],
  bentFork: ['Ray sold a unit before the door was fully up. The Reverend called it "unkind."', 'The Reverend\'s auction ran past sundown. Two bidders were "saved." One bought a mattress.',
    'The yard board was written on twice this morning. Both handwritings claim tomorrow.', 'The bent fork has been bent a further two degrees. Both sides approve.',
    'Cobb and Dee were seen speaking. Neither will confirm the topic. It was weather.',
    'Ray has started saying "amen" after sales. Ironically, he says. The Reverend has started saying "sold" as a prayer. Also ironically.', 'A bidder folded under Ray and was heard to say "the Reverend would have let me back in." The Reverend, across the lot, nodded.',
    'The Tines prints both auctioneers\' schedules. Both are wrong. Both blame the other\'s handwriting.'],
  marrowCreek: ['Unit 13 was tidy again this morning. The clerk has stopped writing it up.', 'Carl\'s basement lights pulsed slower last night. Neighbors "grateful."',
    'The creek held fog until noon. Tuesday, as usual.', 'A perfectly normal couch remains on Row B. Bidders remain uneasy.',
    'Wanda\'s ribbon entry has been moved to a cooler room. At its request, she says.',
    'The front row of every unit on Row A looked wonderful this morning. Regulars know what that means. Newcomers do not. That is the row.', 'A mannequin was found facing a different direction than it was left. The clerk turned it back. It has turned again.',
    'Ferrell has bought a lamp. It hums. He has returned the lamp. The lamp is still humming, in the office.'],
  vermillion: ['The engraver on Rue Street is backed up three weeks. Everyone is a regular now.', 'Vale identified a maker\'s mark through a closed door on Thursday. The door was later opened. He was right.',
    'Charlie has bought a fourth item that shines. It is plated. He is delighted.', 'The gala committee has announced next year\'s cause: the gala.',
    'A laminated bidder card was seen at the yard. The clerk has recovered.',
    'Viewings are by appointment. The third door is by courage. Regulars say the third door is where the money is. Regulars are not always right. They were Tuesday.', 'The Register\'s society page has been moved to the front. There was nothing else.',
    'A dresser sold as mahogany was pine. A dresser sold as pine was mahogany. The Register calls this "balance."'],
  kettleBasin: ['Seventy-two degrees. Forty percent. The Thermostat has nothing further.', 'A van left the yard packed to the roof. Route 9 sends its regards.',
    'Priscilla was seen without gloves. She was holding gloves.', 'Garrity was in town Tuesday. Something on Row A was perfect. It is not there now.',
    'The museum van has new tires. It also has a new plaque. It will not say for what.',
    'Opening bids are up again. The yard says it knows what it has. The yard is not wrong. That is the problem.', 'A Mint radio arrived home Clean. The bidder has written to the Thermostat about Route 9. The Thermostat has forwarded it to Route 9.',
    'Garrity was not here Wednesday. Row B went cheap. Somebody bought Row B\'s best unit for a song and has not stopped singing.'],
  chromeSprings: ['The clerk has learned a name this month. He will not say whose.', 'The Baroness won two units without speaking. Her driver is hoarse.',
    'Dex has bought a unit "for the aesthetic." It contained mattresses. He is pleased.', 'Pierce Avenue Appraisals has raised its rates. Nobody noticed.',
    'The fountain has been cleaned of coins. The coins were plated.',
    'A rivière sold on Tuesday was glass. A brass bar sold on Wednesday was stamped GOLD. The Courier reminds readers that this is Chrome Springs.', 'The valet has learned to park a van. He has not learned to like it.',
    'The Baroness attended a sale and bought nothing. Regulars have never seen this. Regulars have gone home to think.'],
};
const BRIEF_EVENTS = {
  edNotebookLost: () => 'A green notebook has been reported missing at the storage yard. Its owner describes the contents as "none of your business" and "everything."',
  edNotebookBack: (e) => (e.outcome === 'returned' ? 'A notebook lost at the storage yard was returned by another bidder. Its owner asked the paper not to print the bidder\'s name, then, quietly, to print it.'
    : (e.outcome === 'kept' ? 'Eagle Ed has started a new notebook. He says the old one is "somewhere it should not be." He looked at a van when he said it.'
      : (e.outcome === 'edBought' ? 'Eagle Ed bought a storage unit yesterday to get his own notebook back. He calls it "an investment."'
        : 'A notebook lost at the storage yard is back with its owner. Every page is accounted for. Its owner checked.'))),
  bartTruckShop: () => 'Big Bart\'s truck left the storage yard on a flatbed. Bart walked behind it the whole way. He calls it "a scheduling thing."',
  bartTruckBack: (e) => (e.outcome === 'helped' ? 'Big Bart\'s truck is back from the shop. Bart credits "a friend at the yard" and will not say who.'
    : (e.outcome === 'crossed' ? 'Big Bart\'s truck is back from the shop. Bart says he remembers who made his week longer. He was looking at a van when he said it.'
      : 'Big Bart\'s truck is back from the shop. The transmission is new. The dent is not.')),
  duoSplitUp: () => 'C&K Resale is closed "for inventory." Both owners were at the storage yard yesterday, inventorying separately, from opposite ends of the row.',
  duoBackTogether: (e) => (e.outcome === 'united' ? 'Cody and Kaylee of C&K Resale are back together. Asked what fixed it, both named the same bidder. Neither meant it kindly.'
    : (e.outcome === 'thanks' ? 'C&K Resale has reopened under its old management: both of them. Kaylee thanks "the one person at the yard who stayed out of it."'
      : 'C&K Resale has reopened. The owners describe the week apart as "inventory." The inventory declined to comment.')),
  tenantEvicted: () => 'Merle Tuttle, county lanes league champion 1987 and runner-up 1989 (disputed), has lost his storage unit over back rent. He will attend the auction "to supervise."',
  tenantBack: (e) => (e.outcome === 'soldBack' ? 'A bowling trophy lost at the storage yard auction was sold back to its owner for twenty dollars and a coupon. He describes the buyer as "all right" and the price as "robbery."'
    : (e.outcome === 'kept' ? 'Merle Tuttle reports that his bowling trophies were bought at auction by a bidder who "did not even look at them." He asks the paper to print the words "I know your van."'
      : (e.outcome === 'salBought' ? 'Spite Sal bought a storage unit yesterday containing another man\'s bowling trophies. One is on his dashboard. He says it is not for sale, not for any price, and especially not to Merle.'
        : (e.outcome === 'rivalBought' ? 'Merle Tuttle\'s bowling trophies went at auction yesterday. One was sold back to him. He asks that the price not be printed. It was ten dollars.'
          : 'Nobody bid on Merle Tuttle\'s storage unit. The office has released his bowling trophies to him. The office would like its stapler back.')))),
  tvInterview: (e) => (e.answer === 'whale' ? 'Channel 9 Action News spoke to a bidder at the storage yard yesterday. Asked for the secret, the bidder said: "I pay what it takes." The yard has written that down.'
    : (e.answer === 'shark' ? 'Channel 9 Action News spoke to a bidder at the storage yard yesterday, who said: "I only buy steals." Several regulars have since been seen counting their money again.'
      : 'Channel 9 Action News spoke to a bidder at the storage yard yesterday, who said: "I just like doors." The segment will not air. The yard has already forgotten the face, which appears to have been the idea.')),
  spiteWar: (e) => (e.outcome === 'salStuck' ? 'Spite Sal bought a storage unit yesterday that he did not want, at a price he did not plan. He calls it "a message." The message cost ' + fmt$(e.paid || 0) + '.'
    : (e.outcome === 'youPaid' ? 'A bidder paid ' + fmt$(e.paid || 0) + ' for unit ' + e.unit + ' yesterday after a disagreement with Spite Sal. Sal went home with nothing and is delighted.'
      : 'Spite Sal started a bidding war at the storage yard yesterday and walked away from it. Regulars describe this as "new."')),
  interruption: (e) => (e.kind === 'late' ? rivalName(e.rival) + ' came through the storage yard gate late yesterday, at "going once," and bid anyway. The auctioneer has asked for punctuality.'
    : (e.kind === 'phone' ? 'An absentee bidder called in on the auctioneer\'s line yesterday. The auctioneer describes the voice as "a woman with a cold, or a man with a hobby."'
      : (e.kind === 'power' ? 'The storage yard lost power for four minutes yesterday in the middle of a sale. Bidding resumed. Several numbers did not look the same in the light.'
        : 'Unit ' + e.unit + ' was pulled from auction yesterday when its tenant paid in full at the window, largely in coins.'))),
  storm: () => 'The county expects a storm over the storage yard this morning. Regulars are expected to stay home. The ones who come anyway will say they were never worried.',
  buzzHolidayNews: () => 'Auctioneer Buzz Kettleman has announced his first holiday in eleven years. He will take a week, a folding chair and, he says, "no questions." A speech is feared.',
  buzzHoliday: () => 'Buzz Kettleman began his holiday this morning after a farewell speech at the storage yard about one of the regulars. Witnesses say it ran about a minute long, and then another minute. The Reverend Lyle Pettibone has the gavel.',
  dutchClock: (e) => (e.who === 'you' ? 'Unit ' + e.unit + ' went on Rapid Ray\'s clock yesterday. A bidder shouted first, at ' + fmt$(e.price || 0) + '. Ray says it was "a touch early." Ray says that every time.'
    : (e.who === 'rival' ? rivalName(e.rival) + ' shouted first on Rapid Ray\'s clock yesterday and took unit ' + e.unit + ' for ' + fmt$(e.price || 0) + '. Nobody else opened their mouth in time.'
      : (e.who === 'crowd' ? 'Somebody in the crowd shouted first on Rapid Ray\'s clock yesterday and took unit ' + e.unit + ' for ' + fmt$(e.price || 0) + '. Nobody got a name.'
        : 'Rapid Ray ran unit ' + e.unit + ' all the way down his clock yesterday and nobody shouted. Ray took it personally.'))),
  castPaper: () => 'A regular at the storage auctions was seen reading a piece of paper with somebody else\'s name on it for rather a long time, and then putting it in a pocket.',
  rivalGoalDone: (e) => (e.made
    ? 'A storage regular who spent the month working towards one particular thing has got there, and says so at some length. ' + (e.helped ? 'They credit "somebody at the yard who did not have to."' : 'They credit nobody, which is also a position.')
    : 'A storage regular did not get where they were trying to get this month. ' + (e.spoiled ? 'They have been heard listing the doors that went to somebody else, by number.' : 'They were short by a little, and have asked the Shopper not to print by how much.')),
  rivalUnitUp: () => 'A unit belonging to one of the storage auction regulars was sold at the yard yesterday after the rent went unpaid. The owner attended. The auctioneer called the atmosphere "not our favourite kind of morning."',
  rivalUnitGave: (e) => 'A bidder at the storage yard handed a personal item straight back to the person whose unit it had been, at the rope, in front of the row. The item is described as "worth about four dollars."',
  rivalUnitDone: (e) => (e.outcome === 'kept'
    ? 'The regular whose unit was sold at the storage yard this week has not been seen at the gate since. The yard expects this to pass. The yard is not certain.'
    : e.outcome === 'gaveBack' ? 'The storage yard reports an unusually good-tempered week at the rope, which it credits to "something somebody did on Tuesday."'
    : 'A unit sold at the storage yard this week went to a bidder who had no history with its owner. Several regulars are said to have deliberately kept their hands down.'),
  callDone: (e) => (e.kind === 'tenant'
    ? (e.answer === 'yes' ? 'A former storage tenant says the buyer of their unit returned something to them this week, and asked us to print that. We have.'
      : e.answer === 'nasty' ? 'A former storage tenant bought back an item from their own unit this week at what they describe as "a number." The buyer declined to comment. The number was not declined.'
        : 'A former storage tenant has been ringing around town about one item from their old unit. They would like it known they are still looking.')
    : (e.broken ? 'A storage regular paid a rival to sit out a sale this week, and then watched the rival bid. Both parties agree an arrangement existed. They disagree about the rest of it.'
      : e.answer === 'yes' || e.answer === 'nasty' ? 'Business at the storage yard is conducted, several regulars remind us, by telephone as well as at the rope.'
        : 'A storage regular says they made somebody an offer this week and were turned down. They would like it known that the offer was generous.')),
  favour: () => 'A regular at the storage auctions was overheard asking another for a favour this week. The auctioneer describes this as "how the yard works, mostly."',
  favourDone: (e) => (e.answer === 'nasty'
    ? 'A disagreement between two storage regulars over a promise made last week was settled loudly at the gate yesterday. Both parties describe the matter as closed. Neither looked closed.'
    : e.answer === 'yes' ? 'A storage regular says a rival "did right by them" over a favour last week, and asked for it to be put in the paper. It has been put in the paper.'
    : 'A favour asked at the storage yard last week went unanswered, according to the party who asked. The other party had no comment.'),
  rivalAway: (e) => 'A familiar face was missing from the storage auctions this week. The office says they are ' + (e.why || 'away') + ' and will be back. The bidding was described by one regular as "roomier."',
  rivalBack: (e) => 'A regular returned to the storage auctions after a week away and bid on everything. "Seven days of doors," the auctioneer said. "That is a lot of catching up."',
  feud: (e) => 'Two regulars at the storage auctions ran a unit to ' + fmt$(e.price || 0) + ' yesterday bidding against each other, well past what the unit is thought to have held. Both declined to comment. Both were still there at closing, separately.',
  unitSold: (e) => 'A unit at the storage yard went under the hammer yesterday whose tenant, the office confirms, is a regular at the same auctions. Asked whether that was awkward, the auctioneer said the rent is the rent.',
  sealedBid: (e) => (e.who === 'you' ? 'Unit ' + e.unit + ' was sold on written bids at the storage yard yesterday. The winning slip read ' + fmt$(e.price || 0) + '. The auctioneer called the handwriting "confident."'
    : (e.who === 'rival' ? 'Unit ' + e.unit + ' went on written bids yesterday to ' + rivalName(e.rival) + ', at ' + fmt$(e.price || 0) + '. Several bidders asked to see the other slips. They were not shown the other slips.'
      : (e.who === 'crowd' ? 'Unit ' + e.unit + ' went on written bids yesterday to somebody in the crowd for ' + fmt$(e.price || 0) + '. Nobody got a name, and nobody got a second look at the slip.'
        : 'A unit went to written bids at the storage yard yesterday and not one slip came back with a number on it. The auctioneer has kept them "for the scrapbook."'))),
  absenteeBid: (e) => 'An absentee bidder left ' + fmt$(e.open || 0) + ' on the book for unit ' + e.unit + ' at the storage yard yesterday and stayed on the line. The auctioneer answered for them. Nobody at the yard has ever seen this person.',
  won: (e) => (e.paid < e.value * 0.3 ? 'A unit went yesterday for a third of what was in it. The buyer is not talking.' : (e.paid > e.value * 0.95 ? 'A unit went yesterday for rather more than it held. The buyer is also not talking.' : null)),
  lost: (e) => (e.contested ? 'Unit ' + e.unit + ' went to ' + (rivalName(e.rival)) + '. The underbidder was seen kicking gravel.' : null),
  left: (e) => 'Unit ' + e.unit + ': ' + _aName(e) + ' left behind. The hauler was pleased.',
  perfectVan: () => 'A van left the yard exactly full. Applause was reported.',
  crushed: (e) => { const a = _aName(e); return a.charAt(0).toUpperCase() + a.slice(1) + ' did not survive the drive home. Nothing does.'; },
  keyUsed: () => 'A key from one unit opened a box from another. The clerk has taken the afternoon.',
  tidy13: () => 'Unit 13 was tidy again this morning. Nobody was asked. Nobody answered.',
  broke: () => 'The diner tab is open again. The pie is on the house, once.',
  arrive: (e) => (e.first ? 'A new face at the yard yesterday. The clerk did not catch the name. Yet.' : null),
  yard: () => 'The yard has a new owner. The raccoon has been informed.',
  overpaid: (e) => 'Unit ' + e.unit + ' went for ' + fmt$(e.amt || e.paid || 0) + '. What came out of it fit in one trip. One short trip.',
  sameThing: (e) => { const you = playerEpithet(e.town); return you.charAt(0).toUpperCase() + you.slice(1) + ' now owns four of the same ' + _plainName(e).toLowerCase() + '. Nobody has asked. Everybody wants to.'; },
  blindWin: (e) => 'Unit ' + e.unit + ' was bought without a viewing. The buyer looked, afterwards, for some time.',
  comeback: () => 'The diner tab has been settled. The pie is back to full price. Everyone is relieved, and a little disappointed.',
  raccoon: (e) => 'Deposits the raccoon was seen leaving with ' + _aName(e) + '. He was not stopped. He never is.',
  // the rare days, the morning after
  rareRaccoon: (e) => 'A live raccoon was found in unit ' + e.unit + ' and left there, on advice. A vest was found elsewhere. The paper draws no conclusion.',
  nineLamps: (e) => 'Unit ' + e.unit + ' held nine identical lamps. The buyer has been seen testing outlets all over town.',
  salDentist: () => 'Spite Sal left the yard before the first bid yesterday, citing "dentist." Sal has no dentist. Sal has no teeth he admits to.',
  baroness: () => "A chair described as the Baroness's has changed hands. The county has no baroness. The county has had the chair for some time.",
  unmentionable: (e) => 'Unit ' + e.unit + ' sold yesterday containing an item this paper declines to describe. The buyer would.',
};

// ---- foreshadow: the paper hears about a door before the door arrives ----
// The director plans a week ahead (spec.nextStoryDay), the key calendar and
// the myth epochs are fixed by the seed, and a provenance proof follows its
// anchor on a schedule. Four to nine days before any of those, the paper may
// run a story that is about something else entirely. Never labelled, at most
// one a week, in the third slot like any other story.
const FORESHADOW = {
  story: {
    divorce: { headline: 'COUNTY CLERK REPORTS "A BUSY WEEK FOR FILINGS"', body: 'The clerk\'s office processed more dissolutions this week than in the previous quarter, "and one of them was loud," said a clerk who asked not to be named and then gave her name. Storage yards along the highway are advised to expect furniture. Half of it.', img: 'fs_clerk' },
    magician: { headline: 'THE GREAT SOMEBODY CANCELS SPRING DATES', body: 'A touring magician known by three names has cancelled the rest of his season, citing "a disagreement with a box." His assistant was not available. His assistant may not be anywhere. The props are in storage, somewhere, under one of the names.', img: 'fs_clerk' },
    prepper: { headline: 'SURPLUS STORE REPORTS ONE CUSTOMER, MANY RECEIPTS', body: 'The army surplus on Route 9 says a single customer has bought "everything in tins" over four years and stopped coming in a month ago. "Either he is fine," said the owner, "or he was right." A storage unit is involved. They usually are.', img: 'fs_clerk' },
    kidLeftHome: { headline: 'LOCAL FAMILY TURNS A BEDROOM INTO "AN OFFICE"', body: 'A bedroom on Elm has become an office over one weekend, according to a mother who described the change as "overdue" and then sat down for a while. The contents went to a unit. The unit is paid up until it is not.', img: 'fs_clerk' },
    failedBusiness: { headline: 'STOREFRONT ON MAIN "AVAILABLE AGAIN"', body: 'The building that was a bakery, a phone store and briefly a bakery again is available again. The last tenant left the fixtures in storage and the sign on the door. The landlord is optimistic. The landlord is always optimistic.', img: 'fs_clerk' },
    weddingOff: { headline: 'FLORIST REPORTS A CANCELLATION "OF SOME SIZE"', body: 'A florist on the square has cancelled an order she describes as "the big one," and would say only that the deposit was kept and the doves were not. Two hundred chairs are in a unit on the edge of town. The chairs were also not returned.', img: 'fs_clerk' },
    barClosed: { headline: 'THE LAST CALL WAS LAST CALL, SAYS OWNER', body: 'A bar that has been closing for eleven years has closed. The owner has moved the neon, the stools and "the good bottle" into storage until, he says, the next place. There is not going to be a next place. The stools know it.', img: 'fs_clerk' },
    nightShift: { headline: 'PLANT ENDS NIGHT SHIFT AFTER FORTY YEARS', body: 'The night shift at the plant is over. Forty years of people who slept in the daytime are looking for what to do with the daytime. One of them has put everything he owned between midnight and eight into a unit and gone to see the sun.', img: 'fs_clerk' },
    salesman: { headline: 'TERRITORY "REALIGNED," SALESMAN NOT', body: 'A regional sales representative whose route covered every town on the highway has been told the highway is now somebody else\'s. His samples, his suits and a trunk he calls "the presentation" are in storage. He is at the diner, presenting.', img: 'fs_clerk' },
    collectorUnknowing: { headline: 'ESTATE OF A MAN WHO "KEPT THINGS" TO BE CLEARED', body: 'The family of a man who kept things say they have kept none of them, and that the unit "is mostly dust and one box he was strange about." The county assessor has not been asked to look. The county assessor is looking anyway.', img: 'fs_clerk' },
  },
  key: { headline: 'LOCKSMITH TO RETIRE, "TAKING NOTHING WITH HIM"', body: 'Morrow\'s Lock & Key on Front Street closes at the end of the week after forty-one years. Asked about the wall of uncollected keys behind the counter, Morrow said they belonged to "people who will turn up." He has been saying so since 1987. The keys go into boxes. The boxes go somewhere.', img: 'fs_locksmith' },
  myth: { headline: 'HISTORICAL SOCIETY TO SPEND A WEEK IN {OWNER}', body: 'The County Historical Society will spend next week in {owner} "following up on a rumour," which the society\'s secretary declined to repeat and then repeated, twice, to different people. Members are asked to bring gloves and to say nothing at the diner. They will say everything at the diner.', img: 'fs_society' },
  proof: { headline: 'A PHOTOGRAPH HAS BEEN ASKED ABOUT', body: 'Someone has been asking around the county for a particular photograph. Not the people in it, they say. What is on the desk. The paper has been asked to print this and, for once, has printed exactly what it was asked to print. If you are holding something with a past, it may be about to have a witness.', img: 'fs_photo' },
};
function foreshadowPaper(worldSeed, day, world) {
  const fs = (world.foreshadow = world.foreshadow || { lastDay: -99, printed: null });
  const render = (p) => ({ story: { id: 'fs_' + p.kind + '_' + p.day, kind: 'foreshadow', headline: p.headline, img: p.img }, text: p.body, unitKnown: false, named: null, about: null });
  if (fs.printed && fs.printed.day === day) return render(fs.printed);   // the same morning reads the same paper
  if (day - fs.lastDay < 7) return null;
  const R = RNG(strHash('foreshadow' + worldSeed + '_' + day + '_' + world.town));
  const cands = [];
  const spec = (world.director && world.director.spec) || {};
  if (spec.nextStoryDay && spec.nextStoryId && FORESHADOW.story[spec.nextStoryId]) {
    const lead = spec.nextStoryDay - day;
    if (lead >= 4 && lead <= 9) cands.push(Object.assign({ kind: 'story' }, FORESHADOW.story[spec.nextStoryId]));
  }
  for (let d = day + 4; d <= day + 9; d++) { const kp = keyPlanFor(worldSeed, d); if (kp && kp.kind === 'key') { cands.push(Object.assign({ kind: 'key' }, FORESHADOW.key)); break; } }
  const nextEpochStart = (Math.floor((day - 1) / 12) + 1) * 12 + 1;
  if (nextEpochStart - day >= 4 && nextEpochStart - day <= 9) {
    const owner = mythEpochOwner(worldSeed, nextEpochStart).ownerId;
    if (owner && TOWNS[owner]) {
      const name = TOWNS[owner].name;
      cands.push({ kind: 'myth', headline: FORESHADOW.myth.headline.replace('{OWNER}', name.toUpperCase()), body: FORESHADOW.myth.body.replace('{owner}', name), img: FORESHADOW.myth.img });
    }
  }
  for (const id in PROVENANCE) {
    const c = PROVENANCE[id], st = (world.prov || {})[id];
    if (st && st.held && !st.proofPlanted) { const lead = st.held + c.proof.after - day; if (lead >= 4 && lead <= 9) cands.push(Object.assign({ kind: 'proof' }, FORESHADOW.proof)); }
  }
  if (!cands.length || !R.chance(0.6)) return null;
  const p = R.pick(cands);
  fs.lastDay = day;
  fs.printed = { day, kind: p.kind, headline: p.headline, body: p.body, img: p.img };
  return render(fs.printed);
}
function rivalName(id) {
  const n = NPCS.find((x) => x.id === id) || EXTRA_NPCS[id] || (typeof DUO_HALVES !== 'undefined' && DUO_HALVES[id]);
  return n ? n.name : 'somebody';
}
function paperBriefs(worldSeed, day, world, town) {
  const R = RNG(strHash('briefs' + worldSeed + '_' + day + '_' + town.id));
  const out = [];
  // the corrections box: yesterday's lead named the wrong door. The paper says so, its own way.
  const ll = world && world.lastLead;
  if (ll && ll.day === day - 1 && ll.named && ll.about && ll.named !== ll.about) {
    const label = (ARCHETYPES[ll.arch] || {}).label || 'that unit';
    const regrets = { gypsumCity: 'We regret nothing.', redMesa: 'We regret the confusion, mostly.', chromeSprings: 'No further comment.' };
    out.push('CORRECTION: yesterday we said unit ' + ll.named + ' was the ' + label.toLowerCase() + '. It was unit ' + ll.about + '. ' + (regrets[town.id] || 'We regret the chair.'));
  }
  // one line about yesterday, if yesterday was worth a line
  if (world && world.events) {
    // a rival's story (Bart's truck, Ed's notebook, Cody and Kaylee) outranks the rest of yesterday: it is the news
    const ARC_BRIEFS = ['bartTruckShop', 'bartTruckBack', 'edNotebookLost', 'edNotebookBack', 'duoSplitUp', 'duoBackTogether', 'tenantEvicted', 'tenantBack', 'tvInterview', 'spiteWar', 'storm', 'buzzHolidayNews', 'buzzHoliday'];
    const yesterday = world.events.filter((e) => e.day === day - 1 && e.town === town.id && BRIEF_EVENTS[e.k]);
    yesterday.sort((a, b) => (ARC_BRIEFS.includes(b.k) ? 1 : 0) - (ARC_BRIEFS.includes(a.k) ? 1 : 0));
    for (const e of yesterday) {
      const line = BRIEF_EVENTS[e.k](e);
      if (line) { out.push(line); break; }
    }
  }
  const nb = typeof nutBrief === 'function' ? nutBrief(day, world) : null;
  if (nb) out.unshift(nb);
  const pool = TOWN_BRIEFS[town.id] || TOWN_BRIEFS.dustyFlats;
  const picks = R.shuf(pool).slice(0, 3 - out.length);
  return out.concat(picks);
}
let _paperTownId = 'dustyFlats';
let _paperTownName = 'Dusty Flats';     // genPaper sets it; {town} in a story body becomes this
function _npSub(story, unitNum, aboutNum) {
  if (!story) return null;
  const where = unitNum ? 'unit ' + unitNum : "one of today's units";
  // named: the number the paper printed. about: the unit the story is really about.
  const text = (story.body || '').replace('{unit}', where).replace(/\{town\}/g, _paperTownName);
  return { story, text, unitKnown: !!unitNum, named: unitNum || null, about: aboutNum || null };
}
// the unit numbers today's paper printed next to a story (what a literal reader bids on)
function paperNamedUnits(paper) {
  const p = paper || G.paper;
  if (!p) return [];
  return [p.lead, p.second, p.third].filter((s) => s && s.named).map((s) => s.named);
}
// a real hint about one of today's units, with a number that may or may not be its own
function _archHint(R, lk, today, POOL, used, nameRate, lieRate) {
  const cands = POOL.filter((s) => s.kind === 'arch_hint' && s.arch === lk.archId && !used.has(s.id));
  if (!cands.length) return null;
  const s = R.pick(cands); used.add(s.id);
  let num = R.chance(nameRate) ? lk.num : null;
  if (num && R.chance(lieRate)) {
    const others = today.lockers.filter((o) => o !== lk);
    if (others.length) num = R.pick(others).num;   // names the wrong unit. oops.
  }
  return _npSub(s, num, lk.num);
}

// hints are templates over TODAY'S contracts — the paper realizes real facts,
// and every so often it lies about which unit it means
function genPaper(worldSeed, day, today, foundLegends, seen, world, vanCap) {
  const town = TOWNS[(world && world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
  const R = RNG(strHash('paper' + worldSeed + '_' + day + '_' + town.id));
  _paperTownName = town.name; _paperTownId = town.id;
  seen = seen || [];
  // a story may belong to one town (.town) or to a stretch of the calendar
  // (.minDay / .maxDay); everything else is fair game everywhere
  const POOL = STORIES.filter((s) => (!s.town || s.town === town.id) &&
    (!s.minDay || day >= s.minDay) && (!s.maxDay || day <= s.maxDay));
  const lieRate = town.lieRate || 0.12;       // some papers mean well. some hedge.
  const used = new Set();
  const take = (list) => {
    const c = list.filter((s) => !used.has(s.id));
    if (!c.length) return null;
    const s = c[Math.floor(R.f() * c.length)];
    used.add(s.id);
    return s;
  };
  const flavors = POOL.filter((s) => s.kind === 'flavor');
  // handwritten flavor runs ONCE per save (seen list), then the generator takes over
  const pickFlavor = () => {
    const unseen = flavors.filter((s) => !used.has(s.id) && seen.indexOf(s.id) < 0);
    if (unseen.length && R.chance(0.55)) {
      // a story that only just became possible (day-gated) jumps the queue half the time
      const gated = unseen.filter((s2) => s2.minDay);
      const s = gated.length && R.chance(0.5) ? R.pick(gated) : R.pick(unseen);
      used.add(s.id); seen.push(s.id);
      return _npSub(s);
    }
    if (!unseen.length && R.chance(0.25)) return _npSub(R.pick(flavors));
    return genFlavorStory(R);
  };

  // lead: a real hint about one of today's lockers (70%), else town news.
  // On a dealt morning (the opening) the paper is dealt with the doors: which
  // door, whether it prints the number, and whether the number is right.
  const op = today.facts && today.facts.opening;
  let lead = null;
  let leadLk = null;
  if (op && op.leadIdx >= 0) {
    leadLk = today.lockers[op.leadIdx];
    lead = _archHint(R, leadLk, today, POOL, used, op.nameRate, op.lieRate);
  } else if (R.chance(townRule('paperHintRate', town))) {
    leadLk = R.pick(today.lockers);
    lead = _archHint(R, leadLk, today, POOL, used, townRule('paperNamesUnit', town), lieRate);
  }
  if (!lead) lead = pickFlavor();

  // second: who's in town TOMORROW (the calendar doesn't lie)
  const bid = R.pick(genSpecialists(worldSeed, day + 1)).def.id;
  // the appraiser's date takes the slot when she is due — on its own seed, so nothing else in the paper moves
  const bidFinal = (genAppraiser(worldSeed, day + 1) && RNG(strHash('apprnote' + worldSeed + '_' + day)).chance(0.7)) ? 'appraiser' : bid;
  const secondS = take(POOL.filter((s) => s.kind === 'buyer_hint' && s.buyer === bidFinal));
  const second = secondS ? _npSub(secondS) : pickFlavor();

  // third: a found diary stamps its own story; else a set rumor when pieces
  // are truly in play (45%); else a legendary rumor — louder when this town
  // owns the month's myth; else more town news
  let third = null;
  if (world && world.pendingBlurb && world.pendingBlurbDay === day) {
    const s = STORIES.find((s2) => s2.id === world.pendingBlurb);
    if (s) third = _npSub(s);
  }
  // the yard's own story, on its day
  if (!third && world) third = yardPaper(day, world);
  // an object you hold has a history, and the paper runs the next chapter on schedule
  if (!third && world) third = provPaper(day, world);
  // two days after you did something, the paper has heard about it
  if (!third && world) third = paperCallback(worldSeed, day, world);
  // four to nine days before a door the director has planned, the paper hears about something else
  if (!third && world) third = foreshadowPaper(worldSeed, day, world);
  // Gypsum City runs a second story about a second door. Also numbered. Also, usually, wrong.
  const secondHint = townRule('paperSecondHint', town);
  if (!third && secondHint > 0 && R.chance(secondHint)) {
    const others = today.lockers.filter((lk) => lk !== leadLk);
    if (others.length) third = _archHint(R, R.pick(others), today, POOL, used, townRule('paperNamesUnit', town), lieRate);
  }
  const setsToday = (today.facts && today.facts.setsToday) || [];
  if (!third && setsToday.length && R.chance(0.45)) {
    const sid = R.pick(setsToday).setId;
    const s = take(POOL.filter((s2) => s2.kind === 'set_hint' && s2.set === sid));
    if (s) third = _npSub(s);
  }
  const legendsLeft = LEGENDARY_BASES.map((b) => b.id).filter((id) => !foundLegends.includes(id));
  const epochOwner = mythEpochOwner(worldSeed, day).ownerId;
  const ownedHere = epochOwner === town.id && (town.myths || []).some((m) => legendsLeft.includes(m));
  if (!third && legendsLeft.length && R.chance(ownedHere ? 0.65 : 0.3)) {
    let pool = POOL.filter((s2) => s2.kind === 'legend_hint' && legendsLeft.includes(s2.legend));
    if (ownedHere) {
      const local = pool.filter((s2) => (town.myths || []).includes(s2.legend));
      if (local.length) pool = local;
    }
    const s = take(pool);
    if (s) third = _npSub(s);
  }
  if (!third) third = pickFlavor();

  // the general store runs one honest ad: a tool, in stock, priced to move
  let toolAd = null;
  const ownedTools = (world && world.tools) || [];
  const availTools = Object.keys(TOOL_UNLOCK).filter((t) => day >= TOOL_UNLOCK[t] && !ownedTools.includes(t));
  if (availTools.length && R.chance(0.75)) {
    const t = availTools[day % availTools.length];
    toolAd = { tool: t, price: Math.round(TOOLS[t].price * (town.priceMult || 1)) };
  }
  // the opening: the flashlight is in the paper the morning the second row matters, the mirror the morning the front row lies
  if (op && op.tool && !ownedTools.includes(op.tool) && day >= (TOOL_UNLOCK[op.tool] || 99)) {
    toolAd = { tool: op.tool, price: Math.round(TOOLS[op.tool].price * (town.priceMult || 1)) };
  }

  // Dusty Flats Motors finally has the big van in
  let vanAd = null;
  if (day >= 6 && (vanCap || 40) < 60 && R.chance(0.65)) {
    vanAd = { cap: 60, price: 400, name: 'panel van' };
  } else if (day >= 14 && (vanCap || 40) < 90 && R.chance(0.5)) {
    vanAd = { cap: 90, price: 1100, name: 'box truck' };
  }

  // classifieds: handwritten + generated mix
  const ads = R.shuf(POOL.filter((s) => s.kind === 'ad')).slice(0, R.i(1, 2));
  ads.push(genAd(R));
  // a blind sale, two days on, sometimes surfaces here instead of the front page — on its own
  // seed, and picked by hash, so nothing else in the paper moves (memory.js, docs/APPRAISAL.md §8)
  if (world) for (const e of (world.events || [])) {
    if (e.day !== day - 2 || soldBlindNote(worldSeed, e) !== 'ad') continue;
    ads.unshift({ id: 'ad_pawn_' + e.day, kind: 'ad', body: PAWN_ADS[strHash('pawnad' + (e.uid || e.base)) % PAWN_ADS.length].replace('{hint}', blindHint(e)) });
    break;
  }
  if (world && world.yard && world.yard.stage >= 3 && !world.yard.owned && town.id === 'dustyFlats') ads.unshift(yardAd(world.yard.declined || 0));   // the sign, in print
  else if (world && world.yard && world.yard.owned && town.id === 'dustyFlats' && R.chance(0.35)) ads.unshift({ id: 'ad_yard_owned', kind: 'ad', body: 'STORAGE YARD. Not for sale. Stop asking. Three doors a day, same as ever. — the management' });
  const briefs = paperBriefs(worldSeed, day, world, town);
  // a buyer's want ad (postCommission ran this morning, before the presses)
  const wantAd = world ? (publicCommissions(world)[0] || null) : null;   // a phone order is never printed
  return { lead, second, third, ads: R.shuf(ads), toolAd, vanAd, wantAd, briefs, day };
}

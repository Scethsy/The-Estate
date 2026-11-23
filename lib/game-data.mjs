export const GROUPS = {
  brown: { label: "Brown", color: "#96674a", buildCost: 50 },
  lightBlue: { label: "Light Blue", color: "#77c8dc", buildCost: 50 },
  pink: { label: "Pink", color: "#cf77ad", buildCost: 100 },
  orange: { label: "Orange", color: "#ec9c52", buildCost: 100 },
  red: { label: "Red", color: "#dd6258", buildCost: 150 },
  yellow: { label: "Yellow", color: "#e8cf69", buildCost: 150 },
  green: { label: "Green", color: "#69ae85", buildCost: 200 },
  darkBlue: { label: "Dark Blue", color: "#586bb2", buildCost: 200 },
};

const street = (id, name, price, group, rents) => ({ id, name, price, group, rents, kind: "street" });
const railroad = (id, name) => ({ id, name, price: 200, group: "railroad", kind: "railroad" });
const utility = (id, name) => ({ id, name, price: 150, group: "utility", kind: "utility" });
const special = (id, name, kind) => ({ id, name, kind });

export const BOARD = [
  special(0, "GO", "go"),
  street(1, "Old Harbor", 60, "brown", [2, 10, 30, 90, 160, 250]),
  special(2, "Community Chest", "chest"),
  street(3, "Maple Lane", 60, "brown", [4, 20, 60, 180, 320, 450]),
  special(4, "Income Tax", "incomeTax"),
  railroad(5, "North Station"),
  street(6, "Willow Avenue", 100, "lightBlue", [6, 30, 90, 270, 400, 550]),
  special(7, "Chance", "chance"),
  street(8, "Cedar Avenue", 100, "lightBlue", [6, 30, 90, 270, 400, 550]),
  street(9, "Pine Avenue", 120, "lightBlue", [8, 40, 100, 300, 450, 600]),
  special(10, "Jail / Just Visiting", "jail"),
  street(11, "Rose Street", 140, "pink", [10, 50, 150, 450, 625, 750]),
  utility(12, "Electric Works"),
  street(13, "Garden Street", 140, "pink", [10, 50, 150, 450, 625, 750]),
  street(14, "Market Street", 160, "pink", [12, 60, 180, 500, 700, 900]),
  railroad(15, "East Station"),
  street(16, "Copper Road", 180, "orange", [14, 70, 200, 550, 750, 950]),
  special(17, "Community Chest", "chest"),
  street(18, "Amber Road", 180, "orange", [14, 70, 200, 550, 750, 950]),
  street(19, "Sunset Road", 200, "orange", [16, 80, 220, 600, 800, 1000]),
  special(20, "Free Parking", "parking"),
  street(21, "River Drive", 220, "red", [18, 90, 250, 700, 875, 1050]),
  special(22, "Chance", "chance"),
  street(23, "Lake Drive", 220, "red", [18, 90, 250, 700, 875, 1050]),
  street(24, "Hill Drive", 240, "red", [20, 100, 300, 750, 925, 1100]),
  railroad(25, "South Station"),
  street(26, "Golden Plaza", 260, "yellow", [22, 110, 330, 800, 975, 1150]),
  street(27, "Silver Plaza", 260, "yellow", [22, 110, 330, 800, 975, 1150]),
  utility(28, "Water Works"),
  street(29, "Grand Plaza", 280, "yellow", [24, 120, 360, 850, 1025, 1200]),
  special(30, "Go To Jail", "goToJail"),
  street(31, "Forest Boulevard", 300, "green", [26, 130, 390, 900, 1100, 1275]),
  street(32, "Valley Boulevard", 300, "green", [26, 130, 390, 900, 1100, 1275]),
  special(33, "Community Chest", "chest"),
  street(34, "Summit Boulevard", 320, "green", [28, 150, 450, 1000, 1200, 1400]),
  railroad(35, "West Station"),
  special(36, "Chance", "chance"),
  street(37, "Ocean Promenade", 350, "darkBlue", [35, 175, 500, 1100, 1300, 1500]),
  special(38, "Luxury Tax", "luxuryTax"),
  street(39, "Crown Promenade", 400, "darkBlue", [50, 200, 600, 1400, 1700, 2000]),
];

export const DEEDS = BOARD.filter((space) => "price" in space);
export const COLOR_GROUPS = Object.keys(GROUPS);
export const DEFAULT_COLORS = ["#db5b56", "#5282d4", "#56a978", "#9b6bcb", "#dba856"];

// Card text is original paraphrase. Effects follow the classic deck structure.
export const CHANCE = [
  { id: "ch-go", text: "Advance to GO. Collect $200.", effect: { type: "move", to: 0 } },
  { id: "ch-hill", text: "Advance to Hill Drive. Collect $200 if you pass GO.", effect: { type: "move", to: 24 } },
  { id: "ch-rose", text: "Advance to Rose Street. Collect $200 if you pass GO.", effect: { type: "move", to: 11 } },
  { id: "ch-utility", text: "Advance to the nearest utility. If owned, pay ten times your dice total.", effect: { type: "nearest", kind: "utility", rentMultiplier: 10 } },
  { id: "ch-rail-a", text: "Advance to the nearest station. If owned, pay double rent.", effect: { type: "nearest", kind: "railroad", rentMultiplier: 2 } },
  { id: "ch-rail-b", text: "Advance to the nearest station. If owned, pay double rent.", effect: { type: "nearest", kind: "railroad", rentMultiplier: 2 } },
  { id: "ch-dividend", text: "The bank pays you a $50 dividend.", effect: { type: "bank", amount: 50 } },
  { id: "ch-free", text: "Keep this card to leave Jail without paying.", effect: { type: "jailFree" } },
  { id: "ch-back", text: "Move back three spaces.", effect: { type: "back", spaces: 3 } },
  { id: "ch-jail", text: "Go directly to Jail. Do not collect $200.", effect: { type: "jail" } },
  { id: "ch-repairs", text: "Pay $25 per house and $100 per hotel for repairs.", effect: { type: "repairs", house: 25, hotel: 100 } },
  { id: "ch-fine", text: "Pay a $15 fine.", effect: { type: "bank", amount: -15 } },
  { id: "ch-north", text: "Take a trip to North Station. Collect $200 if you pass GO.", effect: { type: "move", to: 5 } },
  { id: "ch-chair", text: "Pay each other player $50.", effect: { type: "each", amount: -50 } },
  { id: "ch-crown", text: "Advance to Crown Promenade. Collect $200 if you pass GO.", effect: { type: "move", to: 39 } },
  { id: "ch-loan", text: "Your building loan matures. Collect $150.", effect: { type: "bank", amount: 150 } },
];

export const CHEST = [
  { id: "cc-go", text: "Advance to GO. Collect $200.", effect: { type: "move", to: 0 } },
  { id: "cc-bank", text: "A bank correction gives you $200.", effect: { type: "bank", amount: 200 } },
  { id: "cc-doctor", text: "Pay a $50 medical fee.", effect: { type: "bank", amount: -50 } },
  { id: "cc-stock", text: "Collect $50 from a stock sale.", effect: { type: "bank", amount: 50 } },
  { id: "cc-free", text: "Keep this card to leave Jail without paying.", effect: { type: "jailFree" } },
  { id: "cc-jail", text: "Go directly to Jail. Do not collect $200.", effect: { type: "jail" } },
  { id: "cc-holiday", text: "Collect $100 from your holiday fund.", effect: { type: "bank", amount: 100 } },
  { id: "cc-refund", text: "Collect a $20 tax refund.", effect: { type: "bank", amount: 20 } },
  { id: "cc-birthday", text: "It is your birthday. Collect $10 from each other player.", effect: { type: "each", amount: 10 } },
  { id: "cc-insurance", text: "Collect $100 in life insurance proceeds.", effect: { type: "bank", amount: 100 } },
  { id: "cc-hospital", text: "Pay $100 in hospital fees.", effect: { type: "bank", amount: -100 } },
  { id: "cc-school", text: "Pay $50 in school fees.", effect: { type: "bank", amount: -50 } },
  { id: "cc-consult", text: "Collect a $25 consultation fee.", effect: { type: "bank", amount: 25 } },
  { id: "cc-repairs", text: "Pay $40 per house and $115 per hotel for street repairs.", effect: { type: "repairs", house: 40, hotel: 115 } },
  { id: "cc-prize", text: "Collect a $10 contest prize.", effect: { type: "bank", amount: 10 } },
  { id: "cc-inherit", text: "Inherit $100.", effect: { type: "bank", amount: 100 } },
];

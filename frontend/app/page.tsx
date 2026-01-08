"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

interface PredictionResponse {
  prediction: string;
  confidence: number;
  probs: {
    home_win: number;
    draw: number;
    away_win: number;
  };
  home_form: string[];
  away_form: string[];
  h2h_history: {
    date: string;
    home: string;
    away: string;
    home_score: number;
    away_score: number;
  }[];
  models?: {
    xgboost: {
      prediction: string;
      confidence: number;
      probs: { home_win: number; draw: number; away_win: number };
    };
  };
}

interface UpcomingMatch {
  id: number;
  date: string;
  home_team: string;
  away_team: string;
}

interface User {
  username: string;
  balance: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  balance: number;
}

// --- Country Mapping for Flags & Regions ---
interface TeamInfo {
  code: string;
  region: string;
}

const TEAMS_DATA: Record<string, TeamInfo> = {
  // Europe
  "Albania": { code: "al", region: "Europe" }, "Andorra": { code: "ad", region: "Europe" }, "Armenia": { code: "am", region: "Europe" }, "Austria": { code: "at", region: "Europe" }, "Azerbaijan": { code: "az", region: "Europe" },
  "Belarus": { code: "by", region: "Europe" }, "Belgium": { code: "be", region: "Europe" }, "Bosnia and Herzegovina": { code: "ba", region: "Europe" }, "Bulgaria": { code: "bg", region: "Europe" },
  "Croatia": { code: "hr", region: "Europe" }, "Cyprus": { code: "cy", region: "Europe" }, "Czech Republic": { code: "cz", region: "Europe" }, "Denmark": { code: "dk", region: "Europe" }, "Estonia": { code: "ee", region: "Europe" },
  "Faroe Islands": { code: "fo", region: "Europe" }, "Finland": { code: "fi", region: "Europe" }, "France": { code: "fr", region: "Europe" }, "Georgia": { code: "ge", region: "Europe" }, "Germany": { code: "de", region: "Europe" },
  "Gibraltar": { code: "gi", region: "Europe" }, "Greece": { code: "gr", region: "Europe" }, "Hungary": { code: "hu", region: "Europe" }, "Iceland": { code: "is", region: "Europe" }, "Ireland": { code: "ie", region: "Europe" },
  "Israel": { code: "il", region: "Europe" }, "Italy": { code: "it", region: "Europe" }, "Kazakhstan": { code: "kz", region: "Europe" }, "Kosovo": { code: "xk", region: "Europe" }, "Latvia": { code: "lv", region: "Europe" },
  "Liechtenstein": { code: "li", region: "Europe" }, "Lithuania": { code: "lt", region: "Europe" }, "Luxembourg": { code: "lu", region: "Europe" }, "Malta": { code: "mt", region: "Europe" }, "Moldova": { code: "md", region: "Europe" },
  "Monaco": { code: "mc", region: "Europe" }, "Montenegro": { code: "me", region: "Europe" }, "Netherlands": { code: "nl", region: "Europe" }, "North Macedonia": { code: "mk", region: "Europe" },
  "Norway": { code: "no", region: "Europe" }, "Poland": { code: "pl", region: "Europe" }, "Portugal": { code: "pt", region: "Europe" }, "Romania": { code: "ro", region: "Europe" }, "Russia": { code: "ru", region: "Europe" },
  "San Marino": { code: "sm", region: "Europe" }, "Serbia": { code: "rs", region: "Europe" }, "Slovakia": { code: "sk", region: "Europe" }, "Slovenia": { code: "si", region: "Europe" }, "Spain": { code: "es", region: "Europe" },
  "Sweden": { code: "se", region: "Europe" }, "Switzerland": { code: "ch", region: "Europe" }, "Turkey": { code: "tr", region: "Europe" }, "Ukraine": { code: "ua", region: "Europe" }, "United Kingdom": { code: "gb", region: "Europe" },
  "England": { code: "gb-eng", region: "Europe" }, "Scotland": { code: "gb-sct", region: "Europe" }, "Wales": { code: "gb-wls", region: "Europe" }, "Northern Ireland": { code: "gb-nir", region: "Europe" },

  // South America
  "Argentina": { code: "ar", region: "South America" }, "Bolivia": { code: "bo", region: "South America" }, "Brazil": { code: "br", region: "South America" }, "Chile": { code: "cl", region: "South America" }, "Colombia": { code: "co", region: "South America" },
  "Ecuador": { code: "ec", region: "South America" }, "Paraguay": { code: "py", region: "South America" }, "Peru": { code: "pe", region: "South America" }, "Uruguay": { code: "uy", region: "South America" }, "Venezuela": { code: "ve", region: "South America" },

  // North & Central America
  "Antigua and Barbuda": { code: "ag", region: "North America" }, "Bahamas": { code: "bs", region: "North America" }, "Barbados": { code: "bb", region: "North America" }, "Belize": { code: "bz", region: "North America" },
  "Canada": { code: "ca", region: "North America" }, "Costa Rica": { code: "cr", region: "North America" }, "Cuba": { code: "cu", region: "North America" }, "Dominica": { code: "dm", region: "North America" }, "Dominican Republic": { code: "do", region: "North America" },
  "El Salvador": { code: "sv", region: "North America" }, "Grenada": { code: "gd", region: "North America" }, "Guatemala": { code: "gt", region: "North America" }, "Haiti": { code: "ht", region: "North America" }, "Honduras": { code: "hn", region: "North America" },
  "Jamaica": { code: "jm", region: "North America" }, "Mexico": { code: "mx", region: "North America" }, "Nicaragua": { code: "ni", region: "North America" }, "Panama": { code: "pa", region: "North America" }, "Puerto Rico": { code: "pr", region: "North America" },
  "Saint Kitts and Nevis": { code: "kn", region: "North America" }, "Saint Lucia": { code: "lc", region: "North America" }, "Saint Vincent and the Grenadines": { code: "vc", region: "North America" },
  "Trinidad and Tobago": { code: "tt", region: "North America" }, "United States": { code: "us", region: "North America" },

  // Africa
  "Algeria": { code: "dz", region: "Africa" }, "Angola": { code: "ao", region: "Africa" }, "Benin": { code: "bj", region: "Africa" }, "Botswana": { code: "bw", region: "Africa" }, "Burkina Faso": { code: "bf", region: "Africa" },
  "Burundi": { code: "bi", region: "Africa" }, "Cameroon": { code: "cm", region: "Africa" }, "Cape Verde": { code: "cv", region: "Africa" }, "Central African Republic": { code: "cf", region: "Africa" },
  "Chad": { code: "td", region: "Africa" }, "Comoros": { code: "km", region: "Africa" }, "Congo": { code: "cg", region: "Africa" }, "DR Congo": { code: "cd", region: "Africa" }, "Djibouti": { code: "dj", region: "Africa" },
  "Egypt": { code: "eg", region: "Africa" }, "Equatorial Guinea": { code: "gq", region: "Africa" }, "Eritrea": { code: "er", region: "Africa" }, "Eswatini": { code: "sz", region: "Africa" }, "Ethiopia": { code: "et", region: "Africa" },
  "Gabon": { code: "ga", region: "Africa" }, "Gambia": { code: "gm", region: "Africa" }, "Ghana": { code: "gh", region: "Africa" }, "Guinea": { code: "gn", region: "Africa" }, "Guinea-Bissau": { code: "gw", region: "Africa" },
  "Ivory Coast": { code: "ci", region: "Africa" }, "Kenya": { code: "ke", region: "Africa" }, "Lesotho": { code: "ls", region: "Africa" }, "Liberia": { code: "lr", region: "Africa" }, "Libya": { code: "ly", region: "Africa" },
  "Madagascar": { code: "mg", region: "Africa" }, "Malawi": { code: "mw", region: "Africa" }, "Mali": { code: "ml", region: "Africa" }, "Mauritania": { code: "mr", region: "Africa" }, "Mauritius": { code: "mu", region: "Africa" },
  "Morocco": { code: "ma", region: "Africa" }, "Mozambique": { code: "mz", region: "Africa" }, "Namibia": { code: "na", region: "Africa" }, "Niger": { code: "ne", region: "Africa" }, "Nigeria": { code: "ng", region: "Africa" },
  "Rwanda": { code: "rw", region: "Africa" }, "Sao Tome and Principe": { code: "st", region: "Africa" }, "Senegal": { code: "sn", region: "Africa" }, "Seychelles": { code: "sc", region: "Africa" },
  "Sierra Leone": { code: "sl", region: "Africa" }, "Somalia": { code: "so", region: "Africa" }, "South Africa": { code: "za", region: "Africa" }, "South Sudan": { code: "ss", region: "Africa" },
  "Sudan": { code: "sd", region: "Africa" }, "Tanzania": { code: "tz", region: "Africa" }, "Togo": { code: "tg", region: "Africa" }, "Tunisia": { code: "tn", region: "Africa" }, "Uganda": { code: "ug", region: "Africa" },
  "Zambia": { code: "zm", region: "Africa" }, "Zimbabwe": { code: "zw", region: "Africa" },

  // Asia
  "Afghanistan": { code: "af", region: "Asia" }, "Bahrain": { code: "bh", region: "Asia" }, "Bangladesh": { code: "bd", region: "Asia" }, "Bhutan": { code: "bt", region: "Asia" }, "Brunei": { code: "bn", region: "Asia" },
  "Cambodia": { code: "kh", region: "Asia" }, "China": { code: "cn", region: "Asia" }, "Hong Kong": { code: "hk", region: "Asia" }, "India": { code: "in", region: "Asia" }, "Indonesia": { code: "id", region: "Asia" },
  "Iran": { code: "ir", region: "Asia" }, "Iraq": { code: "iq", region: "Asia" }, "Japan": { code: "jp", region: "Asia" }, "Jordan": { code: "jo", region: "Asia" }, "Kuwait": { code: "kw", region: "Asia" }, "Kyrgyzstan": { code: "kg", region: "Asia" },
  "Laos": { code: "la", region: "Asia" }, "Lebanon": { code: "lb", region: "Asia" }, "Macau": { code: "mo", region: "Asia" }, "Malaysia": { code: "my", region: "Asia" }, "Maldives": { code: "mv", region: "Asia" },
  "Mongolia": { code: "mn", region: "Asia" }, "Myanmar": { code: "mm", region: "Asia" }, "Nepal": { code: "np", region: "Asia" }, "North Korea": { code: "kp", region: "Asia" }, "Oman": { code: "om", region: "Asia" },
  "Pakistan": { code: "pk", region: "Asia" }, "Palestine": { code: "ps", region: "Asia" }, "Philippines": { code: "ph", region: "Asia" }, "Qatar": { code: "qa", region: "Asia" }, "Saudi Arabia": { code: "sa", region: "Asia" },
  "Singapore": { code: "sg", region: "Asia" }, "South Korea": { code: "kr", region: "Asia" }, "Sri Lanka": { code: "lk", region: "Asia" }, "Syria": { code: "sy", region: "Asia" }, "Taiwan": { code: "tw", region: "Asia" },
  "Tajikistan": { code: "tj", region: "Asia" }, "Thailand": { code: "th", region: "Asia" }, "Timor-Leste": { code: "tl", region: "Asia" }, "Turkmenistan": { code: "tm", region: "Asia" },
  "United Arab Emirates": { code: "ae", region: "Asia" }, "Uzbekistan": { code: "uz", region: "Asia" }, "Vietnam": { code: "vn", region: "Asia" }, "Yemen": { code: "ye", region: "Asia" },

  // Oceania
  "American Samoa": { code: "as", region: "Oceania" }, "Australia": { code: "au", region: "Oceania" }, "Cook Islands": { code: "ck", region: "Oceania" }, "Fiji": { code: "fj", region: "Oceania" },
  "New Zealand": { code: "nz", region: "Oceania" }, "Papua New Guinea": { code: "pg", region: "Oceania" }, "Samoa": { code: "ws", region: "Oceania" }, "Solomon Islands": { code: "sb", region: "Oceania" },
  "Tahiti": { code: "pf", region: "Oceania" }, "Tonga": { code: "to", region: "Oceania" }, "Vanuatu": { code: "vu", region: "Oceania" },
  // Additional teams for WC 2026 placeholder
  "Curacao": { code: "cw", region: "North America" },
  "Uzbekistan": { code: "uz", region: "Asia" }
};

// Pools for simulation (simplified)
const QUALI_POOLS: Record<string, string[]> = {
  "Europe": ["Italy", "Croatia", "Denmark", "Switzerland", "Serbia", "Poland", "Sweden", "Ukraine", "Turkey", "Norway", "Austria", "Hungary", "Czech Republic", "Scotland", "Wales", "Romania"],
  "South Am": ["Uruguay", "Colombia", "Chile", "Ecuador", "Paraguay", "Peru", "Venezuela", "Bolivia"],
  "Africa": ["Morocco", "Senegal", "Tunisia", "Cameroon", "Nigeria", "Egypt", "Algeria", "Ghana", "Ivory Coast", "Mali"],
  "Asia": ["Japan", "Iran", "South Korea", "Australia", "Saudi Arabia", "Qatar", "Iraq", "UAE", "Uzbekistan", "Jordan"],
  "Concacaf": ["Costa Rica", "Panama", "Jamaica", "Honduras", "El Salvador", "Curacao", "Haiti"],
  "Oceania": ["New Zealand", "Fiji", "Solomon Islands"]
};

const INITIAL_WC_GROUPS: Record<string, string[]> = {
  "Group A": ["Mexico", "South Africa", "South Korea", "Denmark"],
  "Group B": ["Canada", "Italy", "Qatar", "Switzerland"],
  "Group C": ["Brazil", "Morocco", "Haiti", "Scotland"],
  "Group D": ["United States", "Paraguay", "Australia", "Turkey"],
  "Group E": ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
  "Group F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
  "Group G": ["Belgium", "Egypt", "Iran", "New Zealand"],
  "Group H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  "Group I": ["France", "Senegal", "Iraq", "Norway"],
  "Group J": ["Argentina", "Algeria", "Austria", "Jordan"],
  "Group K": ["Portugal", "Jamaica", "Uzbekistan", "Colombia"],
  "Group L": ["England", "Croatia", "Ghana", "Panama"]
};

// Simplified FIFA Ranking (Lower is better)
const FIFA_RANKINGS: Record<string, number> = {
  "Argentina": 1, "France": 2, "Brazil": 3, "England": 4, "Belgium": 5, "Portugal": 6, "Netherlands": 7, "Spain": 8, "Italy": 9, "Croatia": 10,
  "United States": 11, "Colombia": 12, "Morocco": 13, "Mexico": 14, "Uruguay": 15, "Germany": 16, "Senegal": 17, "Japan": 18, "Switzerland": 19, "Iran": 20,
  "Denmark": 21, "South Korea": 22, "Australia": 23, "Ukraine": 24, "Austria": 25, "Sweden": 26, "Poland": 27, "Hungary": 28, "Serbia": 29, "Wales": 30,
  "Tunisia": 31, "Scotland": 32, "Algeria": 33, "Egypt": 34, "Turkey": 35, "Russia": 36, "Czech Republic": 37, "Chile": 38, "Panama": 39, "Ecuador": 40,
  "Nigeria": 41, "Norway": 42, "Cameroon": 43, "Canada": 44, "Ivory Coast": 45, "Romania": 46, "Slovakia": 47, "Mali": 48, "Greece": 49, "Saudi Arabia": 50,
  "Qatar": 60, "Ghana": 61, "South Africa": 65, "Iraq": 68, "Montenegro": 70, "Uzbekistan": 73, "Jordan": 80, "Honduras": 81, "Jamaica": 55, "Haiti": 90, 
  "Curacao": 90, "Bolivia": 85, "New Zealand": 100
};

const getFlagUrl = (teamName: string) => {
  const data = TEAMS_DATA[teamName];
  if (!data) return null;
  return `https://flagcdn.com/w40/${data.code}.png`;
};

// --- Components ---

const FormBadge = ({ result }: { result: string }) => {
  const color = 
    result === "W" ? "bg-green-500" : 
    result === "D" ? "bg-gray-400" : 
    "bg-red-500";
  
  return (
    <div className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold shadow-sm border border-white/20`}>
      {result}
    </div>
  );
};

const TeamCombobox = ({ 
  label, 
  value, 
  onChange, 
  teams 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  teams: string[] 
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeams = teams.filter(team => 
    team.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFlag = getFlagUrl(value);

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full p-3 text-left border border-gray-300 rounded-lg bg-white flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm hover:border-gray-400"
        >
          <div className="flex items-center gap-3">
            {selectedFlag ? (
              <img src={selectedFlag} alt={value} className="w-6 h-4 object-cover rounded-sm shadow-sm" />
            ) : (
              <div className="w-6 h-4 bg-gray-100 rounded-sm" />
            )}
            <span className={value ? "text-gray-900 font-medium" : "text-gray-500"}>
              {value || "Select a team..."}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredTeams.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">No team found.</div>
              ) : (
                filteredTeams.map((team) => {
                  const flag = getFlagUrl(team);
                  return (
                    <div
                      key={team}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 transition ${
                        value === team ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                      }`}
                      onClick={() => {
                        onChange(team);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {flag && <img src={flag} alt={team} className="w-5 h-3.5 object-cover rounded-sm" />}
                        {team}
                      </div>
                      {value === team && <Check className="h-4 w-4" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [teams, setTeams] = useState<string[]>([]);
  const [homeTeam, setHomeTeam] = useState<string>("");
  const [awayTeam, setAwayTeam] = useState<string>("");
  const [neutralVenue, setNeutralVenue] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  
  // Gamification State
  const [user, setUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [stake, setStake] = useState<number>(50);
  const [betTeam, setBetTeam] = useState<string | null>(null); // "home" or "away"
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lastWin, setLastWin] = useState<number | null>(null);

  // Tournament State
  const [mode, setMode] = useState<"single" | "tournament">("single");
  const [tournamentTeams, setTournamentTeams] = useState<string[]>(Array(8).fill(""));
  const [tournamentRegion, setTournamentRegion] = useState<string>("All");
  const [tournamentBracket, setTournamentBracket] = useState<any[]>([]); // Simplified bracket structure
  const [tournamentWinner, setTournamentWinner] = useState<string | null>(null);

  // WC 2026 State
  const [wcMode, setWcMode] = useState<"qualifiers" | "groups" | "knockout">("qualifiers");
  const [wcGroups, setWcGroups] = useState<Record<string, string[]>>(INITIAL_WC_GROUPS);
  const [wcResults, setWcResults] = useState<Record<string, any[]>>({}); // Stores match results per group
  const [wcStandings, setWcStandings] = useState<Record<string, any[]>>({}); // Stores table per group
  const [wcKnockout, setWcKnockout] = useState<any[]>([]); // Array of rounds

  // Fetch teams and upcoming matches on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Teams
        const resTeams = await fetch("http://localhost:8001/teams");
        if (resTeams.ok) {
          const data = await resTeams.json();
          // Filter out teams without flags (not in TEAMS_DATA)
          const validTeams = data.teams.filter((t: string) => TEAMS_DATA[t]);
          setTeams(validTeams);
          if (validTeams.length > 1) {
            setHomeTeam(validTeams[0]);
            setAwayTeam(validTeams[1]);
          }
        }

        // Fetch Upcoming Matches
        const resUpcoming = await fetch("http://localhost:8001/upcoming");
        if (resUpcoming.ok) {
          const data = await resUpcoming.json();
          // Filter matches to only include teams with flags and take top 6
          const validMatches = data.matches.filter((m: UpcomingMatch) => 
            TEAMS_DATA[m.home_team] && TEAMS_DATA[m.away_team]
          ).slice(0, 6);
          setUpcomingMatches(validMatches);
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
        setTeams(["Switzerland", "Germany", "France", "Italy", "Brazil", "Argentina", "Spain", "England"]);
      }
    };
    fetchData();
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("http://localhost:8001/leaderboard");
      const data = await res.json();
      setLeaderboard(data.leaderboard);
    } catch (e) {
      console.error("Failed to load leaderboard", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    try {
      const res = await fetch("http://localhost:8001/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput }),
      });
      const data = await res.json();
      setUser(data);
    } catch (e) {
      alert("Login failed");
    }
  };

  const handlePredict = async () => {
    setError(null);
    setResult(null);
    setLastWin(null);

    if (homeTeam === awayTeam) {
      setError("Home team and Away team cannot be the same.");
      return;
    }

    // Validation for Bet
    if (user && betTeam) {
      if (stake > user.balance) {
        alert("Nicht genug Guthaben!");
        return;
      }
      if (stake <= 0) {
        alert("Einsatz muss positiv sein.");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:8001/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ home_team: homeTeam, away_team: awayTeam, neutral_venue: neutralVenue }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch prediction");
      }

      const data = await response.json();
      
      // Use XGBoost if available
      if (data.models && data.models.xgboost) {
        data.prediction = data.models.xgboost.prediction;
        data.confidence = data.models.xgboost.confidence;
        data.probs = data.models.xgboost.probs;
      }
      
      setResult(data);

      // BETTING LOGIC
      if (user && betTeam) {
        const predictedWinner = data.prediction; // "home_win", "away_win", "draw"
        const confidence = data.confidence;
        
        // Calculate Odds (simplified: 1 / probability)
        let odds = 1 / confidence;
        if (odds < 1.01) odds = 1.01;
        
        let won = false;
        let winAmount = 0;
        let balanceChange = 0;

        // Did user win?
        if (betTeam === "home" && predictedWinner === "home_win") won = true;
        else if (betTeam === "away" && predictedWinner === "away_win") won = true;
        
        if (won) {
          winAmount = Math.floor(stake * odds);
          balanceChange = winAmount - stake; // Net profit
          setLastWin(winAmount);
        } else {
          balanceChange = -stake;
          setLastWin(0);
        }

        // Update Backend
        const updateRes = await fetch("http://localhost:8001/user/update_balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username, amount: balanceChange }),
        });
        const updateData = await updateRes.json();
        setUser({ ...user, balance: updateData.new_balance });
        fetchLeaderboard(); // Refresh Leaderboard
      }

    } catch (err) {
      setError("An error occurred. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // WC Functionality
  const simulateQualifiers = () => {
    const newGroups = JSON.parse(JSON.stringify(INITIAL_WC_GROUPS));
    const pools = JSON.parse(JSON.stringify(QUALI_POOLS));
    
    // Shuffle pools
    Object.keys(pools).forEach(k => {
      pools[k] = pools[k].sort(() => 0.5 - Math.random());
    });

    Object.keys(newGroups).forEach(groupName => {
      newGroups[groupName] = newGroups[groupName].map((team: string) => {
        if (team.includes("Slot") || team.includes("Playoff")) {
          // Identify continent/pool
          let poolName = "";
          if (team.includes("Europe") || team.includes("UEFA")) poolName = "Europe";
          else if (team.includes("Africa")) poolName = "Africa";
          else if (team.includes("Asia")) poolName = "Asia";
          else if (team.includes("South Am")) poolName = "South Am";
          else if (team.includes("Concacaf")) poolName = "Concacaf";
          else if (team.includes("Oceania")) poolName = "Oceania";
          else if (team.includes("FIFA")) poolName = "Europe"; // Simplified: Take from Europe pool as wildcards

          if (poolName && pools[poolName] && pools[poolName].length > 0) {
            return pools[poolName].pop()!;
          }
           // Fallback if pool empty 
           if (pools["Europe"].length > 0) return pools["Europe"].pop()!;
        }
        return team;
      });
    });
    setWcGroups(newGroups);
    setWcMode("groups");
    setWcResults({});
    setWcStandings({});
  };

  const simulateGroupMatch = async (home: string, away: string) => {
    try {
      const res = await fetch("http://localhost:8001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_team: home, away_team: away, neutral_venue: true }),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error(e);
      return { prediction: "draw" }; // Fallback
    }
  };

  const simulateGroup = async (groupName: string) => {
    const teams = wcGroups[groupName];
    // Round Robin (4 teams)
    const matches = [
      [teams[0], teams[1]], [teams[2], teams[3]],
      [teams[0], teams[2]], [teams[1], teams[3]],
      [teams[0], teams[3]], [teams[1], teams[2]]
    ];

    setLoading(true);
    const results = [];
    const points: Record<string, number> = {};
    const gf: Record<string, number> = {};
    const ga: Record<string, number> = {};
    
    teams.forEach(t => { points[t] = 0; gf[t] = 0; ga[t] = 0; });

    for (let m of matches) {
      const home = m[0];
      const away = m[1];
      const data = await simulateGroupMatch(home, away);
      
      let winner = data.prediction === "home_win" ? home : data.prediction === "away_win" ? away : "draw";

      // --- STRENGTH CORRECTION ---
      const rankH = FIFA_RANKINGS[home] || 75; 
      const rankA = FIFA_RANKINGS[away] || 75;
      const rankDiff = rankA - rankH; // Positive if Home is better (Rank 1 vs 50 -> 49)
      
      // If one team is significantly better (>20 ranks), bias the winner
      const randomFactor = Math.random();
      if (rankDiff > 25) { 
         // Home is much better
         if (randomFactor > 0.15) winner = home; // 85% chance to correct standard upsets
      } else if (rankDiff < -25) {
         // Away is much better
         if (randomFactor > 0.15) winner = away;
      } else if (rankDiff > 10) {
         // Home is slightly better
         if (winner === away && randomFactor > 0.6) winner = "draw"; // Mitigate full upsets
      } else if (rankDiff < -10) {
         // Away is slightly better
         if (winner === home && randomFactor > 0.6) winner = "draw";
      }

      // Simulate scores based on strength
      let scoreH = 0;
      let scoreA = 0;
      
      // Base goals based on general strength (better teams score more)
      const strengthBonusH = rankH < 20 ? 1 : 0;
      const strengthBonusA = rankA < 20 ? 1 : 0;

      if (winner === home) { 
        scoreH = Math.floor(Math.random() * 3) + 1 + strengthBonusH; 
        scoreA = Math.floor(Math.random() * (scoreH)); // Loser scores less
      }
      else if (winner === away) { 
        scoreA = Math.floor(Math.random() * 3) + 1 + strengthBonusA; 
        scoreH = Math.floor(Math.random() * (scoreA)); 
      }
      else { 
        scoreH = Math.floor(Math.random() * 2) + 1; 
        scoreA = scoreH; 
      }

      results.push({ home, away, winner, scoreH, scoreA });
      
      gf[home] += scoreH; ga[home] += scoreA;
      gf[away] += scoreA; ga[away] += scoreH;

      if (winner === home) points[home] += 3;
      else if (winner === away) points[away] += 3;
      else { points[home] += 1; points[away] += 1; }
    }

    setWcResults(prev => ({ ...prev, [groupName]: results }));
    
    // Calculate Standings with GD
    const standings = Object.keys(points).map(team => ({
      team, 
      points: points[team],
      gf: gf[team],
      ga: ga[team],
      gd: gf[team] - ga[team]
    })).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    
    setWcStandings(prev => ({ ...prev, [groupName]: standings }));
    setLoading(false);
  };

  const simulateAllGroups = async () => {
    for (let group of Object.keys(wcGroups)) {
      await simulateGroup(group);
    }
  };

  // WC Knockout Logic
  const setupKnockoutStage = () => {
    // 1. Gather all teams with stats
    let allTeams: any[] = [];
    Object.keys(wcStandings).forEach(group => {
       wcStandings[group].forEach((t: any, idx: number) => {
          allTeams.push({ ...t, group, rank: idx + 1 });
       });
    });

    if (allTeams.length < 48) {
      alert("Please simulate all groups first!");
      return;
    }

    // 2. Identify Qualifiers
    const top2 = allTeams.filter(t => t.rank <= 2);
    const thirdPlace = allTeams.filter(t => t.rank === 3)
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
      .slice(0, 8);
      
    const qualifiers = [...top2, ...thirdPlace];
    
    // Sort for seeding: Best vs Worst
    const seeded = qualifiers.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    
    // Create Round of 32
    const round32 = [];
    for(let i=0; i<16; i++) {
       round32.push({
         id: `R32-${i}`,
         home: seeded[i].team,
         away: seeded[31-i].team,
         winner: null,
         score: null 
       });
    }
    
    setWcKnockout([round32]);
    setWcMode("knockout");
  };

  const simulateKnockoutMatch = async (roundIdx: number, matchIdx: number) => {
    const match = wcKnockout[roundIdx][matchIdx];
    if (match.winner) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8001/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ home_team: match.home, away_team: match.away, neutral_venue: true }),
      });
      const data = await res.json();
      const prediction = data.models?.xgboost?.prediction || data.prediction;
      
      let winner = prediction === "home_win" ? match.home : prediction === "away_win" ? match.away : "draw";
      let scoreH = 0, scoreA = 0;
      
      // Basic Score Sim
      if (winner === match.home) { scoreH = Math.floor(Math.random()*3)+1; scoreA = Math.floor(Math.random()*scoreH); }
      else if (winner === match.away) { scoreA = Math.floor(Math.random()*3)+1; scoreH = Math.floor(Math.random()*scoreA); }
      else { 
        // Draw -> Penalties logic (random 50/50 for winner)
        scoreH = 1; scoreA = 1; 
        winner = Math.random() > 0.5 ? match.home : match.away;
      }

      const newKnockout = [...wcKnockout];
      newKnockout[roundIdx][matchIdx] = { ...match, winner, score: `${scoreH}-${scoreA} ${prediction === "draw" ? "(PK)" : ""}` };
      setWcKnockout(newKnockout);

    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const simulateKnockoutRound = async (roundIdx: number) => {
      const matches = wcKnockout[roundIdx];
      for(let i=0; i<matches.length; i++) {
          await simulateKnockoutMatch(roundIdx, i);
      }
  };

  const createNextRound = () => {
    const currentRound = wcKnockout[wcKnockout.length - 1];
    if (currentRound.some((m: any) => !m.winner)) {
        alert("Please finish all matches in the current round.");
        return;
    }

    const nextRoundMatches = [];
    for(let i=0; i < currentRound.length; i+=2) {
        const m1 = currentRound[i];
        const m2 = currentRound[i+1];
        nextRoundMatches.push({
            id: `R${currentRound.length+1}-${i}`,
            home: m1.winner,
            away: m2.winner,
            winner: null,
            score: null
        });
    }

    if (nextRoundMatches.length > 0) {
        setWcKnockout([...wcKnockout, nextRoundMatches]);
    } else {
        alert(`Champion: ${currentRound[0].winner} 🏆`);
    }
  };

  // Tournament Logic
  const randomizeTournament = () => {
    let pool = teams;
    if (tournamentRegion !== "All") {
      pool = teams.filter(t => TEAMS_DATA[t]?.region === tournamentRegion);
    }
    
    if (pool.length < 8) {
      alert(`Not enough teams in ${tournamentRegion} (Found ${pool.length}, need 8).`);
      return;
    }

    // Shuffle and pick 8
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setTournamentTeams(shuffled.slice(0, 8));
    setTournamentBracket([]);
    setTournamentWinner(null);
  };

  const simulateTournament = async () => {
    if (tournamentTeams.some(t => !t)) {
      alert("Please fill all 8 team slots.");
      return;
    }
    
    setLoading(true);
    setTournamentBracket([]);
    setTournamentWinner(null);

    try {
      // Quarter Finals (8 teams -> 4 matches)
      const qf_matches = [];
      const qf_winners = [];
      for (let i = 0; i < 8; i += 2) {
        const home = tournamentTeams[i];
        const away = tournamentTeams[i+1];
        const res = await fetch("http://localhost:8001/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ home_team: home, away_team: away }),
        });
        const data = await res.json();
        const prediction = data.models?.xgboost?.prediction || data.prediction;
        const winner = prediction === "home_win" ? home : prediction === "away_win" ? away : (Math.random() > 0.5 ? home : away); // Handle draw randomly for tournament
        qf_matches.push({ home, away, winner });
        qf_winners.push(winner);
      }

      // Semi Finals (4 teams -> 2 matches)
      const sf_matches = [];
      const sf_winners = [];
      for (let i = 0; i < 4; i += 2) {
        const home = qf_winners[i];
        const away = qf_winners[i+1];
        const res = await fetch("http://localhost:8001/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ home_team: home, away_team: away }),
        });
        const data = await res.json();
        const prediction = data.models?.xgboost?.prediction || data.prediction;
        const winner = prediction === "home_win" ? home : prediction === "away_win" ? away : (Math.random() > 0.5 ? home : away);
        sf_matches.push({ home, away, winner });
        sf_winners.push(winner);
      }

      // Final (2 teams -> 1 match)
      const home = sf_winners[0];
      const away = sf_winners[1];
      const res = await fetch("http://localhost:8001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_team: home, away_team: away }),
      });
      const data = await res.json();
      const prediction = data.models?.xgboost?.prediction || data.prediction;
      const winner = prediction === "home_win" ? home : prediction === "away_win" ? away : (Math.random() > 0.5 ? home : away);
      
      setTournamentBracket([qf_matches, sf_matches, [{ home, away, winner }]]);
      setTournamentWinner(winner);

    } catch (e) {
      console.error(e);
      alert("Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Visual helpers
  const isHomeWinner = result?.prediction === "home_win";
  const isAwayWinner = result?.prediction === "away_win";
  const isDraw = result?.prediction === "draw";

  // RENDER LOGIN SCREEN IF NOT LOGGED IN
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">⚽ Match Predictor</h1>
          <p className="text-gray-500 mb-8">Logge dich ein, um zu wetten und die Rangliste zu stürmen!</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Dein Username"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors text-lg"
            >
              Start Game 🚀
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Players</h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 3).map((entry) => (
                <div key={entry.username} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">#{entry.rank} {entry.username}</span>
                  <span className="font-bold text-green-600">{Math.floor(entry.balance)} €</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-100 to-slate-200">
      
      {/* HEADER WITH USER INFO */}
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-white/50">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-2 rounded-full text-xl">👤</div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Player</p>
            <p className="font-bold text-gray-800">{user.username}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-bold">Balance</p>
          <p className={`text-2xl font-black ${lastWin && lastWin > 0 ? "text-green-600 animate-pulse" : "text-blue-600"}`}>
            {Math.floor(user.balance)} €
          </p>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/50 backdrop-blur-sm">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <h1 className="text-3xl font-bold tracking-tight">Match Predictor</h1>
          <p className="text-slate-400 mt-2">AI-Powered Football Forecast</p>
          
          {/* Mode Switcher */}
          <div className="flex justify-center mt-6 gap-4">
            <button 
              onClick={() => setMode("single")}
              className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === "single" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              Single Match
            </button>
            <button 
              onClick={() => setMode("tournament")}
              className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === "tournament" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              Tournament Mode 🏆
            </button>
            <button 
              onClick={() => setMode("wc26")}
              className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === "wc26" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              World Cup 2026 🌍
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          {mode === "single" && (
            <>
              {/* Selection Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                
                {/* VS Badge */}
                <div className="hidden md:flex absolute left-1/2 top-9 -translate-x-1/2 z-10 bg-white rounded-full p-2 shadow-md border border-gray-100">
                  <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">VS</span>
                </div>

                <TeamCombobox 
                  label="Home Team" 
                  value={homeTeam} 
                  onChange={setHomeTeam} 
                  teams={teams} 
                />
                
                <TeamCombobox 
                  label="Away Team" 
                  value={awayTeam} 
                  onChange={setAwayTeam} 
                  teams={teams} 
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              {/* Neutral Venue Toggle */}
              <div className="flex justify-center">
                <label className="inline-flex items-center cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors select-none">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={neutralVenue}
                    onChange={(e) => setNeutralVenue(e.target.checked)}
                  />
                  <span className="ml-2 text-gray-700 font-medium text-sm">Neutral Venue 🏟️</span>
                </label>
              </div>

              {/* Action Button */}
              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex justify-center items-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing Matchup...
                  </>
                ) : (
                  "Predict Winner"
                )}
              </button>

              {/* BETTING SECTION */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                  💰 Place your Bet
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={() => setBetTeam("home")}
                    className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${
                      betTeam === "home" 
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                        : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    {homeTeam || "Home Team"} Wins
                  </button>
                  <button
                    onClick={() => setBetTeam("away")}
                    className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${
                      betTeam === "away" 
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                        : "border-gray-200 bg-white hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    {awayTeam || "Away Team"} Wins
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Stake (€)</label>
                    <input
                      type="number"
                      min="1"
                      max={user.balance}
                      value={stake}
                      onChange={(e) => setStake(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
                    />
                  </div>
                  <div className="flex-1 text-right">
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Potential Win</label>
                     <div className="text-gray-400 text-xs italic pt-2">Calculated after prediction</div>
                  </div>
                </div>
              </div>

              {/* RESULT MESSAGE FOR BETTING */}
              {result && betTeam && (
                <div className={`mt-4 p-4 rounded-xl text-center border animate-in zoom-in-95 ${lastWin && lastWin > 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  {lastWin && lastWin > 0 ? (
                    <div>
                      <p className="font-black text-2xl mb-1">🎉 +{lastWin} €</p>
                      <p className="text-sm font-medium opacity-75">You won! The AI agreed with you.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-black text-2xl mb-1">💸 -{stake} €</p>
                      <p className="text-sm font-medium opacity-75">Lost. Better luck next time!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Result Display */}
              {result && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  
                  {/* Winner Banner */}
                  <div className="relative overflow-hidden rounded-2xl p-6 text-center mb-6 border border-gray-200 shadow-sm transition-all duration-500">
                    {/* Background Blur */}
                    {(isHomeWinner || isAwayWinner) && (
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={getFlagUrl(isHomeWinner ? homeTeam : awayTeam)!} 
                          className="w-full h-full object-cover opacity-30 blur-xl scale-150"
                          alt="background"
                        />
                        <div className="absolute inset-0 bg-white/50" />
                      </div>
                    )}
                    
                    <div className="relative z-10">
                      <div className="text-sm font-bold uppercase tracking-wider mb-2 text-gray-500">Predicted Outcome</div>
                    
                      <div className="flex items-center justify-center gap-4 mb-2">
                         {isHomeWinner && getFlagUrl(homeTeam) && <img src={getFlagUrl(homeTeam)!} className="w-10 h-7 object-cover rounded shadow-sm" />}
                         {isAwayWinner && getFlagUrl(awayTeam) && <img src={getFlagUrl(awayTeam)!} className="w-10 h-7 object-cover rounded shadow-sm" />}
                      </div>

                      <div className={`text-4xl font-black ${
                        isHomeWinner ? "text-slate-800" :
                        isAwayWinner ? "text-slate-800" :
                        "text-gray-700"
                      }`}>
                        {isHomeWinner && `${homeTeam} Wins!`}
                        {isAwayWinner && `${awayTeam} Wins!`}
                        {isDraw && "Draw"}
                      </div>
                    <div className="mt-2 font-medium text-gray-500">
                      {(result.confidence * 100).toFixed(1)}% Confidence
                    </div>

                    {/* Form Badges */}
                    <div className="mt-6 flex justify-between items-center px-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Home Form</span>
                        <div className="flex gap-1">
                          {result.home_form.map((res, i) => <FormBadge key={i} result={res} />)}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Away Form</span>
                        <div className="flex gap-1">
                          {result.away_form.map((res, i) => <FormBadge key={i} result={res} />)}
                        </div>
                      </div>
                    </div>

                    {/* H2H History */}
                    {result.h2h_history.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-3">Last Meetings</div>
                        <div className="space-y-2">
                          {result.h2h_history.map((match, i) => (
                            <div key={i} className="flex justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <span className="text-gray-400 text-xs">{match.date.split('-')[0]}</span>
                              <div className="font-medium">
                                {match.home} <span className="mx-1 text-gray-400">{match.home_score}-{match.away_score}</span> {match.away}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                  </div>

                  {/* Probability Bars */}
                  <div className="grid grid-cols-3 gap-2 h-32 items-end">
                    {/* Home Bar */}
                    <div className="flex flex-col items-center gap-2 group">
                      <span className={`font-bold text-sm ${isHomeWinner ? "text-green-600" : "text-gray-500"}`}>
                        {(result.probs.home_win * 100).toFixed(0)}%
                      </span>
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-1000 ease-out relative overflow-hidden ${
                          isHomeWinner ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "bg-gray-200"
                        }`}
                        style={{ height: `${result.probs.home_win * 100}%` }}
                      >
                        {isHomeWinner && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-1.5 max-w-full">
                        {getFlagUrl(homeTeam) && <img src={getFlagUrl(homeTeam)!} className="w-4 h-3 object-cover rounded-[1px]" />}
                        <span className="text-xs font-medium text-gray-500 truncate">{homeTeam}</span>
                      </div>
                    </div>

                    {/* Draw Bar */}
                    <div className="flex flex-col items-center gap-2">
                      <span className={`font-bold text-sm ${isDraw ? "text-gray-800" : "text-gray-400"}`}>
                        {(result.probs.draw * 100).toFixed(0)}%
                      </span>
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-1000 ease-out ${
                          isDraw ? "bg-gray-600" : "bg-gray-200"
                        }`}
                        style={{ height: `${result.probs.draw * 100}%` }}
                      />
                      <span className="text-xs font-medium text-gray-400">Draw</span>
                    </div>

                    {/* Away Bar */}
                    <div className="flex flex-col items-center gap-2 group">
                      <span className={`font-bold text-sm ${isAwayWinner ? "text-red-600" : "text-gray-500"}`}>
                        {(result.probs.away_win * 100).toFixed(0)}%
                      </span>
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-1000 ease-out relative overflow-hidden ${
                          isAwayWinner ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" : "bg-gray-200"
                        }`}
                        style={{ height: `${result.probs.away_win * 100}%` }}
                      >
                        {isAwayWinner && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-1.5 max-w-full">
                        {getFlagUrl(awayTeam) && <img src={getFlagUrl(awayTeam)!} className="w-4 h-3 object-cover rounded-[1px]" />}
                        <span className="text-xs font-medium text-gray-500 truncate">{awayTeam}</span>
                      </div>
                    </div>
                  </div>

                  {/* Model Comparison - REMOVED as we only use XGBoost now */}


                </div>
              )}
            </>
          )}

          {mode === "tournament" && (
            // TOURNAMENT MODE UI
            <div className="space-y-6">
              {/* Setup Controls */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">Region:</span>
                  <select 
                    value={tournamentRegion}
                    onChange={(e) => setTournamentRegion(e.target.value)}
                    className="p-2 rounded border border-slate-300 text-sm"
                  >
                    <option value="All">All World</option>
                    <option value="Europe">Europe</option>
                    <option value="South America">South America</option>
                    <option value="North America">North America</option>
                    <option value="Africa">Africa</option>
                    <option value="Asia">Asia</option>
                  </select>
                </div>
                <button 
                  onClick={randomizeTournament}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-2"
                >
                  🎲 Randomize Teams
                </button>
                <button 
                  onClick={simulateTournament}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-purple-500/30 disabled:opacity-50"
                >
                  {loading ? "Simulating..." : "▶ Start Tournament"}
                </button>
              </div>

              {/* Team Slots */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tournamentTeams.map((team, idx) => (
                  <div key={idx} className="relative">
                    <TeamCombobox 
                      label={`Slot ${idx + 1}`}
                      value={team}
                      onChange={(val) => {
                        const newTeams = [...tournamentTeams];
                        newTeams[idx] = val;
                        setTournamentTeams(newTeams);
                      }}
                      teams={teams}
                    />
                  </div>
                ))}
              </div>

              {/* Bracket Display */}
              {tournamentBracket.length > 0 && (
                <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  
                  {/* Quarter Finals */}
                  <div>
                    <h3 className="text-center text-xs font-bold text-slate-400 uppercase mb-4">Quarter Finals</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {tournamentBracket[0].map((match: any, i: number) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 text-xs shadow-sm flex flex-col gap-1">
                          <div className={`flex justify-between ${match.winner === match.home ? "font-bold text-green-600" : "text-slate-500"}`}>
                            <span>{match.home}</span>
                            {match.winner === match.home && "✓"}
                          </div>
                          <div className={`flex justify-between ${match.winner === match.away ? "font-bold text-green-600" : "text-slate-500"}`}>
                            <span>{match.away}</span>
                            {match.winner === match.away && "✓"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Semi Finals */}
                  <div>
                    <h3 className="text-center text-xs font-bold text-slate-400 uppercase mb-4">Semi Finals</h3>
                    <div className="flex justify-center gap-8">
                      {tournamentBracket[1].map((match: any, i: number) => (
                        <div key={i} className="w-48 bg-white border border-purple-100 rounded-lg p-3 text-sm shadow-md flex flex-col gap-2 relative">
                          <div className={`flex justify-between ${match.winner === match.home ? "font-bold text-purple-700" : "text-slate-500"}`}>
                            <span>{match.home}</span>
                            {match.winner === match.home && "✓"}
                          </div>
                          <div className={`flex justify-between ${match.winner === match.away ? "font-bold text-purple-700" : "text-slate-500"}`}>
                            <span>{match.away}</span>
                            {match.winner === match.away && "✓"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Winner */}
                  <div className="text-center pt-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Champion</h3>
                    <div className="inline-block relative">
                      <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-20 animate-pulse"></div>
                      <div className="relative bg-gradient-to-b from-yellow-50 to-white border-2 border-yellow-200 rounded-2xl p-6 shadow-xl flex flex-col items-center gap-3">
                        <div className="text-4xl">🏆</div>
                        <div className="text-2xl font-black text-slate-800">{tournamentWinner}</div>
                        {getFlagUrl(tournamentWinner!) && <img src={getFlagUrl(tournamentWinner!)!} className="w-16 h-10 object-cover rounded shadow-md" />}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {mode === "wc26" && (
            <div className="space-y-8 animate-in fade-in">
              {/* Controls */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                <h2 className="text-xl font-bold text-slate-700 mb-4">World Cup 2026 Simulation 🌍</h2>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={simulateQualifiers}
                    disabled={wcMode !== "qualifiers" || loading}
                    className={`px-6 py-2 rounded-lg font-bold transition ${wcMode === "qualifiers" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-400"}`}
                  >
                    1. Simulate Qualifiers
                  </button>
                  <button 
                    onClick={simulateAllGroups}
                    disabled={wcMode !== "groups" || loading}
                    className={`px-6 py-2 rounded-lg font-bold transition ${wcMode === "groups" ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-200 text-slate-400"}`}
                  >
                   2. Simulate Group Stage
                  </button>
                  <button 
                    onClick={setupKnockoutStage}
                    disabled={Object.keys(wcResults).length < 12}
                    className={`px-6 py-2 rounded-lg font-bold transition ${Object.keys(wcResults).length === 12 ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-slate-200 text-slate-400"}`}
                  >
                   3. Start Knockout Stage
                  </button>
                </div>
              </div>

              {/* Group Display */}
              {wcMode === "groups" && (
                 <div className="flex flex-wrap justify-center gap-4">
                    {Object.keys(wcGroups).map(groupName => (
                      <div key={groupName} className="w-full md:w-80 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                          <span className="font-bold text-slate-700">{groupName}</span>
                          <button 
                             onClick={() => simulateGroup(groupName)}
                             className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded transition text-slate-600 font-semibold"
                          >
                            Simulate
                          </button>
                        </div>
                        <div className="p-3 flex-grow">
                           {/* Teams or Standings */}
                           {!wcResults[groupName] ? (
                             <ul className="space-y-3">
                               {wcGroups[groupName].map((team: string) => (
                                 <li key={team} className="flex items-center gap-3 text-sm">
                                   {getFlagUrl(team) ? <img src={getFlagUrl(team)!} className="w-6 h-4 object-cover rounded-[2px] shadow-sm" /> : <div className="w-6 h-4 bg-gray-100 rounded-[2px]"></div>}
                                   <span className="font-medium text-slate-700">{team}</span>
                                 </li>
                               ))}
                             </ul>
                           ) : (
                             <div>
                               <table className="w-full text-xs">
                                 <thead>
                                   <tr className="text-slate-400 border-b">
                                      <th className="text-left pb-1 font-medium">Team</th>
                                      <th className="text-center pb-1 font-medium">Pts</th>
                                      <th className="text-center pb-1 font-medium">GD</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {wcStandings[groupName]?.map((s: any, i: number) => (
                                      <tr key={s.team} className={i < 2 ? "bg-green-50/50" : i===2 ? "bg-yellow-50/50" : ""}> 
                                        <td className="py-2 flex items-center gap-2">
                                           {getFlagUrl(s.team) && <img src={getFlagUrl(s.team)!} className="w-5 h-3 object-cover rounded-[1px]" />}
                                           <span className={`${i<2 ? "font-bold text-slate-800" : "text-slate-600"}`}>{s.team}</span>
                                        </td>
                                        <td className="text-center font-bold text-slate-700">{s.points}</td>
                                        <td className="text-center text-slate-500">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                                      </tr>
                                    ))}
                                 </tbody>
                               </table>
                               <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1">
                                  {wcResults[groupName].map((r: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                                      <span className="truncate max-w-[80px]">{r.home.substring(0,3)}-{r.away.substring(0,3)}</span>
                                      <span className="font-mono font-bold text-slate-700 ml-1">{r.scoreH}:{r.scoreA}</span>
                                    </div>
                                  ))}
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                 </div>
              )}

              {/* Knockout Display */}
              {wcMode === "knockout" && (
                <div className="space-y-12">
                   {wcKnockout.map((round, rIdx) => (
                      <div key={rIdx} className="w-full">
                         <h3 className="text-center font-bold text-xl text-slate-700 uppercase mb-6 tracking-widest">
                           {rIdx === 0 ? "Round of 32" : rIdx === 1 ? "Round of 16" : rIdx === 2 ? "Quarter Finals" : rIdx === 3 ? "Semi Finals" : "Final"}
                         </h3>
                         
                         <div className="flex justify-center mb-6">
                           <button 
                             onClick={() => simulateKnockoutRound(rIdx)}
                             disabled={round.every((m:any) => m.winner)}
                             className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-200 transition disabled:opacity-50" 
                            >
                             {round.every((m:any) => m.winner) ? "Round Completed ✅" : "Simulate This Round ⚡"}
                           </button>
                         </div>

                         <div className="flex flex-wrap justify-center gap-6">
                            {round.map((match: any, mIdx: number) => (
                              <div key={match.id} className="w-64 bg-white border border-slate-200 rounded-xl shadow-sm p-4 relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400">Match {mIdx + 1}</div>
                                
                                {/* Home Team */}
                                <div className={`flex justify-between items-center mb-2 p-2 rounded ${match.winner === match.home ? "bg-green-50 border border-green-100" : ""}`}>
                                   <div className="flex items-center gap-2">
                                     {getFlagUrl(match.home) && <img src={getFlagUrl(match.home)!} className="w-6 h-4 object-cover rounded shadow-sm" />}
                                     <span className={`text-sm ${match.winner === match.home ? "font-bold text-slate-800" : "text-slate-600"}`}>{match.home}</span>
                                   </div>
                                   {match.score && <span className="font-mono font-bold text-slate-700">{match.score.split('-')[0]}</span>}
                                </div>
                                
                                {/* Away Team */}
                                <div className={`flex justify-between items-center p-2 rounded ${match.winner === match.away ? "bg-green-50 border border-green-100" : ""}`}>
                                   <div className="flex items-center gap-2">
                                     {getFlagUrl(match.away) && <img src={getFlagUrl(match.away)!} className="w-6 h-4 object-cover rounded shadow-sm" />}
                                     <span className={`text-sm ${match.winner === match.away ? "font-bold text-slate-800" : "text-slate-600"}`}>{match.away}</span>
                                   </div>
                                   {match.score && <span className="font-mono font-bold text-slate-700">{match.score.split('-')[1]?.split(' ')[0]}</span>}
                                </div>

                                {!match.winner && (
                                  <button onClick={() => simulateKnockoutMatch(rIdx, mIdx)} className="w-full mt-3 py-1 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-500 rounded border border-slate-200">
                                    Simulate Match
                                  </button>
                                )}
                              </div>
                            ))}
                         </div>

                         {/* Arrow Next Round */}
                         {round.every((m:any) => m.winner) && rIdx === wcKnockout.length - 1 && rIdx < 4 && (
                           <div className="flex justify-center mt-8">
                             <button onClick={createNextRound} className="animate-bounce bg-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-purple-700 transition">
                                Next Round 👇
                             </button>
                           </div>
                         )}

                         {/* Champion */}
                         {rIdx === 4 && round[0].winner && (
                           <div className="mt-12 text-center animate-in zoom-in duration-500">
                             <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">World Champion 2026</h4>
                             <div className="inline-block p-8 bg-gradient-to-b from-yellow-50 to-white border-4 border-yellow-300 rounded-3xl shadow-xl transform hover:scale-105 transition">
                               <div className="text-6xl mb-4">🏆</div>
                               <div className="flex items-center gap-4 justify-center">
                                 {getFlagUrl(round[0].winner) && <img src={getFlagUrl(round[0].winner)!} className="w-16 h-10 object-cover rounded shadow ring-2 ring-white" />}
                                 <span className="text-4xl font-black text-slate-800">{round[0].winner}</span>
                               </div>
                             </div>
                           </div>
                         )}
                      </div>
                   ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Matches Section (Only in Single Mode) */}
      {mode === "single" && upcomingMatches.length > 0 && (
        <div className="w-full max-w-2xl mt-8">
          <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">📅</span>
            Upcoming Matches
          </h2>
          <div className="grid gap-4">
            {upcomingMatches.map((match) => (
              <div 
                key={match.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => {
                  setHomeTeam(match.home_team);
                  setAwayTeam(match.away_team);
                  setResult(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-400 mb-1">{match.date}</div>
                  <div className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to Predict</div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    {getFlagUrl(match.home_team) && <img src={getFlagUrl(match.home_team)!} className="w-6 h-4 object-cover rounded-sm shadow-sm" />}
                    <span className="font-medium text-gray-800">{match.home_team}</span>
                  </div>
                  <div className="text-gray-300 font-bold text-sm">VS</div>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <span className="font-medium text-gray-800 text-right">{match.away_team}</span>
                    {getFlagUrl(match.away_team) && <img src={getFlagUrl(match.away_team)!} className="w-6 h-4 object-cover rounded-sm shadow-sm" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEADERBOARD SECTION */}
      <div className="w-full max-w-4xl mt-12 mb-12">
        <h2 className="text-xl font-bold text-slate-700 mb-6 text-center flex items-center justify-center gap-2">
          <span>🏆</span> Global Leaderboard
        </h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Player</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((entry) => (
                <tr key={entry.username} className={entry.username === user.username ? "bg-blue-50" : "hover:bg-slate-50 transition"}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{entry.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-green-600">
                    {Math.floor(entry.balance)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}


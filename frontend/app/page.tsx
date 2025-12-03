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
  "Tahiti": { code: "pf", region: "Oceania" }, "Tonga": { code: "to", region: "Oceania" }, "Vanuatu": { code: "vu", region: "Oceania" }
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
  
  // Tournament State
  const [mode, setMode] = useState<"single" | "tournament">("single");
  const [tournamentTeams, setTournamentTeams] = useState<string[]>(Array(8).fill(""));
  const [tournamentRegion, setTournamentRegion] = useState<string>("All");
  const [tournamentBracket, setTournamentBracket] = useState<any[]>([]); // Simplified bracket structure
  const [tournamentWinner, setTournamentWinner] = useState<string | null>(null);

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
  }, []);

  const handlePredict = async () => {
    setError(null);
    setResult(null);

    if (homeTeam === awayTeam) {
      setError("Home team and Away team cannot be the same.");
      return;
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
    } catch (err) {
      setError("An error occurred. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-100 to-slate-200">
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
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          {mode === "single" ? (
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
          ) : (
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
    </main>
  );
}


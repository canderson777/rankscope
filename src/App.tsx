import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import DomainOverview from "./pages/DomainOverview";
import KeywordResearch from "./pages/KeywordResearch";
import BacklinkAnalytics from "./pages/BacklinkAnalytics";
import SiteAudit from "./pages/SiteAudit";
import CompetitorGap from "./pages/CompetitorGap";
import AiVisibility from "./pages/AiVisibility";
import SearchConsole from "./pages/SearchConsole";

export default function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/domain" element={<DomainOverview />} />
              <Route path="/keywords" element={<KeywordResearch />} />
              <Route path="/backlinks" element={<BacklinkAnalytics />} />
              <Route path="/audit" element={<SiteAudit />} />
              <Route path="/gap" element={<CompetitorGap />} />
              <Route path="/ai-visibility" element={<AiVisibility />} />
              <Route path="/search-console" element={<SearchConsole />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

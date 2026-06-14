import { Link } from 'react-router-dom';
import { MessageSquare, AlertTriangle, BarChart3, ArrowRight } from 'lucide-react';
import Button from '../../components/shared/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col relative">
      {/* Header / Navbar */}
      <header className="w-full border-b-[3px] border-[#111827] bg-[#fcfcfc] z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-black select-none flex items-center">
              <span className="text-[#DD614C] mr-1 font-bold">&gt;_</span>
              <span>Git Analyser</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" className="hidden sm:inline-flex">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-6 text-center z-10 pt-16 pb-24">
        <div className="inline-flex items-center self-center px-4 py-2 border-[2.5px] border-[#111827] text-xs text-[#DD614C] font-black uppercase tracking-widest bg-white mb-8 animate-fade-in select-none">
          Next-generation Repository Insights
        </div>

        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-[#111827] leading-[1.0] mb-8 animate-slide-in">
          Talk to your <br />
          <span className="text-[#DD614C]">GitHub Repository</span>
        </h1>

        <p className="text-lg md:text-2xl text-[#111827] font-light tracking-wide max-w-2xl mx-auto mb-12 leading-normal">
          Ask questions about commits, contributors, branches, and merge conflicts in plain English. Get instant answers with citation context.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in">
          <Link to="/signup">
            <Button variant="primary" size="lg" className="w-full sm:w-auto h-13 px-8 text-base">
              Get Started for Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto h-13 px-8 text-base bg-white">
              Explore Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8">
          {/* Card 1 */}
          <div className="p-8 bg-white border-[3px] border-[#111827] brutal-hover flex flex-col">
            <div className="p-3 bg-[#DD614C] text-white border-2 border-[#111827] w-fit mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wide mb-3">AI Repository Chat</h3>
            <p className="text-sm text-[#111827] leading-relaxed font-light">
              Chat directly with your codebase details. Find out which commits solved a specific bug or how the routing system works.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-white border-[3px] border-[#111827] brutal-hover flex flex-col">
            <div className="p-3 bg-[#DAA144] text-[#111827] border-2 border-[#111827] w-fit mb-6">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wide mb-3">Conflict Risk Auditing</h3>
            <p className="text-sm text-[#111827] leading-relaxed font-light">
              Compare branches and get immediate risk profiles (low, medium, high) based on intersection metrics of modified files and diff blocks.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-white border-[3px] border-[#111827] brutal-hover flex flex-col">
            <div className="p-3 bg-[#111827] text-white border-2 border-[#111827] w-fit mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wide mb-3">Contributor Insights</h3>
            <p className="text-sm text-[#111827] leading-relaxed font-light">
              Monitor active project authors, track total additions/deletions, and list commits on a per-contributor basis.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t-[3px] border-[#111827] bg-[#fcfcfc] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#111827] uppercase tracking-wider">
          <p>© 2026 Git Analyser. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#DD614C] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#DD614C] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#DD614C] transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

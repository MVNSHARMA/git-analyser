import { Link } from 'react-router-dom';
import { MessageSquare, AlertTriangle, BarChart3, ArrowRight } from 'lucide-react';
import Button from '../../components/shared/Button';
import ThemeToggle from '../../components/shared/ThemeToggle';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas-default text-fg-default flex flex-col relative">
      {/* Header / Navbar */}
      <header className="w-full border-b border-default bg-canvas-default z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-mono font-semibold select-none flex items-center">
              <span className="text-accent-emphasis mr-1">&gt;_</span>
              <span>Git Analyser</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
        <div className="inline-flex items-center self-center px-4 py-1.5 rounded-full border border-default text-xs text-accent-emphasis font-medium bg-accent-subtle mb-8 animate-fade-in select-none">
          Next-generation Repository Insights
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-fg-default leading-[1.05] mb-8 animate-slide-in">
          Talk to your <br />
          <span className="text-accent-emphasis">GitHub Repository</span>
        </h1>

        <p className="text-lg md:text-xl text-fg-muted max-w-2xl mx-auto mb-12 leading-normal">
          Ask questions about commits, contributors, branches, and merge conflicts in plain English. Get instant answers with citation context.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in">
          <Link to="/signup">
            <Button variant="primary" size="lg" className="w-full sm:w-auto px-8">
              Get Started for Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
              Explore Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8">
          {/* Card 1 */}
          <div className="p-8 surface-card flex flex-col">
            <div className="p-3 bg-accent-emphasis text-fg-onEmphasis rounded-lg w-fit mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-3">AI Repository Chat</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Chat directly with your codebase details. Find out which commits solved a specific bug or how the routing system works.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 surface-card flex flex-col">
            <div className="p-3 bg-attention-emphasis text-fg-onEmphasis rounded-lg w-fit mb-6">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-3">Conflict Risk Auditing</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Compare branches and get immediate risk profiles (low, medium, high) based on intersection metrics of modified files and diff blocks.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 surface-card flex flex-col">
            <div className="p-3 bg-neutral-800 text-fg-onEmphasis rounded-lg w-fit mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-3">Contributor Insights</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Monitor active project authors, track total additions/deletions, and list commits on a per-contributor basis.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-default bg-canvas-default mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-fg-muted">
          <p>© 2026 Git Analyser. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-accent-emphasis transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent-emphasis transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-accent-emphasis transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

import React from 'react';

// Shows the real error instead of a blank white page, and lets the user recover.
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('Page crashed:', error, info.componentStack); }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-xl mx-auto bg-white border border-red-200 rounded-2xl p-6 mt-8">
        <h1 className="text-lg font-extrabold text-red-700">This page hit an error</h1>
        <p className="text-sm text-slate-600 mt-1">Please send a screenshot of this box to the iPEC admin.</p>
        <pre className="mt-3 text-xs bg-red-50 text-red-800 rounded-lg p-3 whitespace-pre-wrap break-words">{String(this.state.error?.message || this.state.error)}</pre>
        <button onClick={() => location.reload()} className="mt-4 bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">Reload page</button>
      </div>
    );
  }
}

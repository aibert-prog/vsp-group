import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';

interface LoginProps {
    onLogin: () => void;
}

// Authorized users list
const ALLOWED_EMAILS = [
    'matt@vspgroup.org',
    'aibert@vspgroup.org',
    'vern@vspgroup.org',
    'michael@vspgroup.org',
    'tandi@tssalesgroup.com'
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 1. Check if already installed/standalone
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        // 2. Check if device is iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // 3. Listen for the 'beforeinstallprompt' event (Android/PC)
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault(); // Prevent immediate mini-infobar
            setDeferredPrompt(e); // Stash the event so it can be triggered later.
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (deferredPrompt) {
            // Android/PC: Trigger the native prompt if captured
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            // Fallback for when programmatic install isn't possible (iOS or prompt missed)
            if (isIOS) {
                alert("To install: Tap the Share button (box with arrow) below, then select 'Add to Home Screen'.");
            } else {
                alert("To install: Click the 'App Available' icon (computer with down arrow) in your browser address bar.");
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network request
        setTimeout(() => {
            if (email && password) {
                // Check Allowlist
                const normalizedEmail = email.trim().toLowerCase();
                if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
                    setError('Access Denied: This email is not authorized to access the system.');
                    setLoading(false);
                    return;
                }

                if (mode === 'signup' && !name) {
                    setError('Please enter your full name.');
                    setLoading(false);
                    return;
                }
                setLoading(false);
                onLogin();
            } else {
                setError('Please enter a valid email and password.');
                setLoading(false);
            }
        }, 800);
    };

    const toggleMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin');
        setError('');
        setName('');
        setEmail('');
        setPassword('');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8 relative z-10 animate-fade-in-up">
                <div className="flex flex-col items-center mb-8">
                    {/* Logo */}
                    <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800 shadow-inner mb-4 p-2">
                        <Logo className="w-full h-full" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight font-serif">VSP GROUP</h1>
                    <p className="text-slate-400 text-sm mt-2">
                        {mode === 'signin' ? 'Virtual Strategic Partnership Group' : 'Create your secure account'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-3 text-red-200 text-sm">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {mode === 'signup' && (
                        <div className="space-y-1.5 animate-fade-in">
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide ml-1">Full Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide ml-1">Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            placeholder="name@vspgroup.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide ml-1">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-cyan-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {mode === 'signin' ? 'Signing in...' : 'Creating Account...'}
                            </>
                        ) : (
                            mode === 'signin' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                        <button 
                            onClick={toggleMode}
                            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                        >
                            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>

                {/* Install App Link - Hidden if already in standalone mode */}
                {!isStandalone && (
                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <a 
                            href="#"
                            onClick={handleInstallClick}
                            className="text-slate-500 hover:text-cyan-400 text-sm transition-colors underline decoration-slate-700 hover:decoration-cyan-400 underline-offset-4 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Install App to Home Screen
                        </a>
                    </div>
                )}
                
                <div className="mt-6 text-center">
                    <p className="text-slate-500 text-xs">
                        &copy; {new Date().getFullYear()} VSP Group LLC. Internal System.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
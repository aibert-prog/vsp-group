import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchTeamTasks, fetchSpaces, processTasksIntoProjects, enrichProjectsWithComments } from './services/clickupService';
import { generateDashboardSummary } from './services/geminiService';
import ProjectTable from './components/ProjectTable';
import AISummaryCard from './components/AISummaryCard';
import TaskPanel from './components/TaskPanel';
import ActivityFeed from './components/ActivityFeed';
import HomeOverview from './components/HomeOverview';
import Login from './components/Login';
import { Logo } from './components/Logo';
import { ProjectData, AIAnalysis, ClickUpSpace, ClickUpComment } from './types';

// Constants for Local Storage Keys
const CACHE_KEYS = {
    SPACES: 'vsp_cache_spaces',
    PROJECTS: 'vsp_cache_projects',
    COMMENTS: 'vsp_cache_comments',
    LAST_UPDATED: 'vsp_cache_last_updated'
};

const App: React.FC = () => {
    // Auth State - Persist to localStorage
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem('vsp_auth') === 'true';
    });

    // View State
    const [view, setView] = useState<'home' | 'space'>('home');

    // Data State
    const [spaces, setSpaces] = useState<ClickUpSpace[]>([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
    const [projects, setProjects] = useState<ProjectData[]>([]);
    
    // Global Comments Feed
    const [recentGlobalComments, setRecentGlobalComments] = useState<ClickUpComment[]>([]);
    
    const [loading, setLoading] = useState<boolean>(false);
    const [tasksLoading, setTasksLoading] = useState<boolean>(false);
    const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
    
    // Tracking updates
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // AI State
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [aiLoading, setAiLoading] = useState<boolean>(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'at_risk' | 'on_track'>('all');

    // --- Caching Helpers ---

    const saveToCache = (dataSpaces: ClickUpSpace[], dataProjects: ProjectData[], dataComments: ClickUpComment[]) => {
        try {
            localStorage.setItem(CACHE_KEYS.SPACES, JSON.stringify(dataSpaces));
            localStorage.setItem(CACHE_KEYS.PROJECTS, JSON.stringify(dataProjects));
            localStorage.setItem(CACHE_KEYS.COMMENTS, JSON.stringify(dataComments));
            localStorage.setItem(CACHE_KEYS.LAST_UPDATED, new Date().toISOString());
            console.log('Data saved to local cache');
        } catch (e) {
            console.warn('Failed to save to cache (likely quota exceeded)', e);
        }
    };

    const loadFromCache = () => {
        try {
            const cachedSpaces = localStorage.getItem(CACHE_KEYS.SPACES);
            const cachedProjects = localStorage.getItem(CACHE_KEYS.PROJECTS);
            const cachedComments = localStorage.getItem(CACHE_KEYS.COMMENTS);
            const cachedTime = localStorage.getItem(CACHE_KEYS.LAST_UPDATED);

            if (cachedSpaces && cachedProjects) {
                setSpaces(JSON.parse(cachedSpaces));
                setProjects(JSON.parse(cachedProjects));
                if (cachedComments) setRecentGlobalComments(JSON.parse(cachedComments));
                if (cachedTime) setLastUpdated(new Date(cachedTime));
                return true;
            }
        } catch (e) {
            console.warn('Failed to parse cache', e);
        }
        return false;
    };

    // --- Data Loading Functions ---

    /**
     * Filters projects based on Space specific rules (e.g. TS Sales folder restrictions)
     */
    const filterProjectsForSpace = useCallback((projects: ProjectData[], spaceId: string, spacesList: ClickUpSpace[]) => {
        const space = spacesList.find(s => s.id === spaceId);
        if (space && (space.name.trim() === 'TS Sales Inc.' || space.name.toLowerCase().includes('ts sales'))) {
            return projects.filter(p => {
                const name = p.name.toLowerCase();
                // Fuzzy matching for requested folders
                return name.includes("report") || 
                       name.includes("email request") || 
                       name.includes("accounting") || 
                       name.includes("shipment tracking");
            });
        }
        return projects;
    }, []);

    /**
     * Load data for the Home/Businesses Overview (All Spaces)
     */
    const loadAllData = async (spacesList: ClickUpSpace[], background = false) => {
        if (!background) setLoading(true);
        setError(null);
        try {
            // Fetch tasks for all spaces
            const rawTasks = await fetchTeamTasks(); 
            let allProjects = processTasksIntoProjects(rawTasks);

            // Apply filters for specific spaces (like TS Sales) globally
            allProjects = allProjects.filter(p => {
                const pSpace = spacesList.find(s => s.id === p.spaceName);
                if (pSpace && (pSpace.name.trim() === 'TS Sales Inc.' || pSpace.name.toLowerCase().includes('ts sales'))) {
                     const name = p.name.toLowerCase();
                     return name.includes("report") || 
                            name.includes("email request") || 
                            name.includes("accounting") || 
                            name.includes("shipment tracking");
                }
                return true;
            });

            setProjects(allProjects);
            setLastUpdated(new Date());
            
            if (!background) {
                setView('home');
                setSelectedSpaceId(null);
            }
            
            // Cache Update (Basic view only saves projects, comments empty for now)
            saveToCache(spacesList, allProjects, []);

        } catch (err: unknown) {
             const message = err instanceof Error ? err.message : 'Failed to load global data';
             if (!background) setError(message);
        } finally {
            setLoading(false);
            setTasksLoading(false);
        }
    };

    /**
     * Load data for a specific Space View
     */
    const loadSpaceData = async (spaceId: string, skipAI: boolean = false) => {
        setLoading(true);
        setTasksLoading(true);
        setCommentsLoading(false);
        setAiLoading(false);
        setError(null);
        
        // Don't wipe state immediately if we have something onscreen
        if (!skipAI) setAiAnalysis(null);

        try {
            // 1. Fetch Tasks
            const rawTasks = await fetchTeamTasks(spaceId);
            let processedProjects = processTasksIntoProjects(rawTasks);

            // Special Filter for TS Sales
            processedProjects = filterProjectsForSpace(processedProjects, spaceId, spaces);

            setProjects(processedProjects);
            setTasksLoading(false);

            // 2. Fetch Comments (Background)
            setCommentsLoading(true);
            const enrichedProjects = await enrichProjectsWithComments(processedProjects);
            setProjects(enrichedProjects);

            // Aggregate comments for feed/AI
            const allComments = enrichedProjects.flatMap(p => p.recentComments)
                .sort((a, b) => parseInt(b.date) - parseInt(a.date));
            setRecentGlobalComments(allComments);
            setCommentsLoading(false);

            // Save complete dataset to cache
            saveToCache(spaces, enrichedProjects, allComments);

            // 3. Generate AI Summary (only if not skipped)
            if (!skipAI) {
                setAiLoading(true);
                const analysis = await generateDashboardSummary(enrichedProjects, allComments);
                setAiAnalysis(analysis);
                setAiLoading(false);
            }

            setLastUpdated(new Date());

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
            setLoading(false);
            setTasksLoading(false);
            setCommentsLoading(false);
            setAiLoading(false);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load - CACHE FIRST strategy
    useEffect(() => {
        if (!isAuthenticated) return;

        const initApp = async () => {
            // 1. Load from cache immediately for instant UI
            const hasCache = loadFromCache();
            
            // 2. If no cache, show loading spinner
            if (!hasCache) {
                setLoading(true);
            }

            // 3. Start Network Sync
            try {
                const fetchedSpaces = await fetchSpaces();
                setSpaces(fetchedSpaces);
                
                // If we loaded cache, just sync in background. 
                // If not, this is the main load.
                await loadAllData(fetchedSpaces, hasCache); 

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to initialize app';
                setError(message);
                setLoading(false);
            }
        };

        initApp();
    }, [isAuthenticated]);

    // Auto-refresh Interval (every 5 mins)
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            if (view === 'space' && selectedSpaceId) {
                console.log("Auto-refreshing space data...");
                loadSpaceData(selectedSpaceId, true); // Skip AI on auto-refresh
            } else if (view === 'home') {
                console.log("Auto-refreshing home data...");
                loadAllData(spaces, true); // Background mode
            }
        }, 300000); 

        return () => clearInterval(interval);
    }, [isAuthenticated, view, selectedSpaceId, spaces]);

    // --- Handlers ---

    const handleLogin = () => {
        localStorage.setItem('vsp_auth', 'true');
        setIsAuthenticated(true);
    };

    const handleRefresh = () => {
        if (view === 'space' && selectedSpaceId) {
            loadSpaceData(selectedSpaceId, false); // Full refresh with AI
        } else {
            loadAllData(spaces, false);
        }
    };

    const handleSelectProject = (project: ProjectData) => {
        setSelectedProject(project);
    };

    const handleClosePanel = () => {
        setSelectedProject(null);
    };

    const handleNavigateToProject = (project: ProjectData) => {
        // Find which space this project belongs to
        const spaceId = project.spaceName; 
        // Switch view to that space
        setView('space');
        setSelectedSpaceId(spaceId);
        // Load that space's data
        loadSpaceData(spaceId, true).then(() => {
             setSelectedProject(project);
        });
    };

    const handleSelectSpace = (spaceId: string) => {
        setView('space');
        setSelectedSpaceId(spaceId);
        loadSpaceData(spaceId, false);
    };

    const handleNavigateHome = () => {
        setView('home');
        setSelectedSpaceId(null);
        // If we have cached global data, we can just reload it or re-fetch
        loadAllData(spaces, false);
    };

    // Derived state for filtering
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' 
                ? true 
                : statusFilter === 'at_risk' 
                    ? (p.riskLevel === 'High' || p.riskLevel === 'Medium')
                    : p.riskLevel === 'Low';
            
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, statusFilter]);

    const isGlobalLoading = loading || tasksLoading || commentsLoading || aiLoading;

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
            {/* STICKY HEADER WRAPPER */}
            <div className="sticky top-0 z-40">
                {/* Header Bar */}
                <header className="bg-slate-900 border-b border-slate-800 shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden p-1">
                                <Logo className="w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold leading-none text-white tracking-tight font-serif">VSP <span className="font-sans font-light text-slate-400 text-sm">GROUP</span></h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-500 hidden sm:inline-block">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                            <button 
                                onClick={handleRefresh}
                                disabled={isGlobalLoading}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold py-1.5 px-3 rounded-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGlobalLoading ? (
                                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                                Sync Data
                            </button>
                        </div>
                    </div>
                </header>

                {/* Navigation Bar */}
                <nav className="bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center space-x-2 py-3 overflow-x-auto custom-scrollbar">
                            <button
                                onClick={handleNavigateHome}
                                className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                                    view === 'home' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Businesses
                            </button>
                            
                            {spaces.map(space => (
                                <div key={space.id} className="flex items-center">
                                    <span className="text-slate-700 mx-2 text-[10px]">•</span>
                                    <button
                                        onClick={() => handleSelectSpace(space.id)}
                                        className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                                            view === 'space' && selectedSpaceId === space.id
                                                ? 'text-cyan-400'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {space.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                
                {/* Error Banner */}
                {error && (
                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h3 className="text-red-200 font-bold text-sm">Error Loading Data</h3>
                            <p className="text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Loading State (Initial) */}
                {loading && !projects.length ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400 animate-pulse font-medium">Connecting to VSP Group Secure Server...</p>
                    </div>
                ) : (
                    <>
                        {/* VIEW: HOME OVERVIEW */}
                        {view === 'home' && (
                            <HomeOverview 
                                projects={projects} 
                                spaces={spaces} 
                                onNavigateToProject={handleNavigateToProject}
                                onSelectSpace={handleSelectSpace}
                            />
                        )}

                        {/* VIEW: SPACE DETAILS */}
                        {view === 'space' && (
                            <div className="animate-fade-in">
                                {/* AI Summary Section */}
                                <AISummaryCard 
                                    analysis={aiAnalysis} 
                                    loading={aiLoading || commentsLoading} 
                                    onRefresh={() => selectedSpaceId && loadSpaceData(selectedSpaceId, false)}
                                />

                                {/* Activity Feed */}
                                <ActivityFeed 
                                    projects={projects} 
                                    loading={commentsLoading} 
                                />

                                {/* Project List Section */}
                                <div className="mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                            Folder Health
                                        </h3>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:flex-none">
                                                <input 
                                                    type="text" 
                                                    placeholder="Search folders..." 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                                />
                                                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <select 
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="at_risk">At Risk</option>
                                                <option value="on_track">On Track</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <ProjectTable 
                                        projects={filteredProjects} 
                                        onSelectProject={handleSelectProject} 
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Side Panel for Details */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={handleClosePanel}></div>
                    <TaskPanel project={selectedProject} onClose={handleClosePanel} />
                </div>
            )}
        </div>
    );
};

export default App;
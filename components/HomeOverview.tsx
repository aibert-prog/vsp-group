import React from 'react';
import { ProjectData, ClickUpSpace } from '../types';

interface HomeOverviewProps {
    projects: ProjectData[];
    spaces: ClickUpSpace[];
    onNavigateToProject: (project: ProjectData) => void;
    onSelectSpace: (spaceId: string) => void;
}

const HomeOverview: React.FC<HomeOverviewProps> = ({ projects, spaces, onNavigateToProject, onSelectSpace }) => {
    
    // Helper to calculate stats for a specific subset of projects
    const getStats = (subsetProjects: ProjectData[]) => {
        const total = subsetProjects.reduce((acc, p) => acc + p.stats.totalTasks, 0);
        const overdue = subsetProjects.reduce((acc, p) => acc + p.stats.overdueTasks, 0);
        const completed = subsetProjects.reduce((acc, p) => acc + p.stats.completedTasks, 0);
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const highRiskCount = subsetProjects.filter(p => p.riskLevel === 'High').length;
        
        let riskStatus = 'Low';
        if (highRiskCount > 0 || overdue > 5) riskStatus = 'High';
        else if (overdue > 0) riskStatus = 'Medium';

        return { total, overdue, completed, completionRate, riskStatus };
    };

    // Calculate Global Stats
    const globalStats = getStats(projects);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Business Entities Overview</h2>
                    <p className="text-slate-400 text-sm">Real-time health monitoring across all VSP Group companies.</p>
                </div>
                
                {/* Global Pulse */}
                <div className="flex gap-6 bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase font-bold">Total Tasks</div>
                        <div className="text-xl font-bold text-white">{globalStats.total}</div>
                    </div>
                    <div className="w-px bg-slate-800"></div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase font-bold">Urgent</div>
                        <div className={`text-xl font-bold ${globalStats.overdue > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {globalStats.overdue}
                        </div>
                    </div>
                    <div className="w-px bg-slate-800"></div>
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase font-bold">Health</div>
                        <div className={`text-xl font-bold ${globalStats.completionRate >= 80 ? 'text-green-400' : 'text-cyan-400'}`}>
                            {globalStats.completionRate}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Business Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map(space => {
                    // Filter projects belonging to this space
                    // Note: API returns space ID, our processing sets spaceName to ID.
                    const spaceProjects = projects.filter(p => p.spaceName === space.id);
                    const stats = getStats(spaceProjects);

                    // Sort folders: Put "Report's" at the bottom as requested
                    const activeFolders = [...spaceProjects].sort((a, b) => {
                         const aName = a.name.toLowerCase();
                         const bName = b.name.toLowerCase();
                         
                         const aIsReport = aName.includes('report');
                         const bIsReport = bName.includes('report');
                         
                         // If a is Report, it goes after b (return 1)
                         if (aIsReport && !bIsReport) return 1;
                         // If b is Report, it goes after a (return -1 so a comes first)
                         if (!aIsReport && bIsReport) return -1;
                         
                         return 0;
                    });

                    return (
                        <div 
                            key={space.id}
                            onClick={() => onSelectSpace(space.id)}
                            className="bg-slate-900 rounded-xl border border-slate-800 hover:border-cyan-500/50 shadow-lg overflow-hidden cursor-pointer transition-all group relative"
                        >
                            {/* Top Accent Line */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${
                                stats.riskStatus === 'High' ? 'bg-red-500' : 
                                stats.riskStatus === 'Medium' ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}></div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                                        {space.name}
                                    </h3>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${
                                        stats.riskStatus === 'High' ? 'bg-red-900/30 text-red-300 border-red-900/50' : 
                                        stats.riskStatus === 'Medium' ? 'bg-amber-900/30 text-amber-300 border-amber-900/50' : 
                                        'bg-green-900/30 text-green-300 border-green-900/50'
                                    }`}>
                                        {stats.riskStatus} Risk
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-400">Completion</span>
                                            <span className="text-slate-200 font-medium">{stats.completionRate}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                    stats.completionRate >= 100 ? 'bg-green-500' : 'bg-cyan-500'
                                                }`} 
                                                style={{ width: `${stats.completionRate}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                                            <div className="text-xs text-slate-500">Active Tasks</div>
                                        </div>
                                        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                                            <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                {stats.overdue}
                                            </div>
                                            <div className="text-xs text-slate-500">Overdue Items</div>
                                        </div>
                                    </div>
                                    
                                    {/* Active Folders Preview */}
                                    <div className="pt-2">
                                        <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Active Folders</p>
                                        <div className="flex flex-wrap gap-2">
                                            {activeFolders.slice(0, 10).map(p => (
                                                <span key={p.id} className={`text-[10px] px-2 py-1 rounded border truncate max-w-[100px] ${
                                                    p.name.toLowerCase().includes('report') 
                                                        ? 'bg-cyan-900/40 text-cyan-200 border-cyan-800 font-medium' 
                                                        : 'text-slate-300 bg-slate-800 border-slate-700'
                                                }`}>
                                                    {p.name}
                                                </span>
                                            ))}
                                            {activeFolders.length > 10 && (
                                                <span className="text-[10px] text-slate-500 px-1 py-1">
                                                    +{activeFolders.length - 10} more
                                                </span>
                                            )}
                                            {activeFolders.length === 0 && (
                                                <span className="text-[10px] text-slate-600 italic">No active folders</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Urgent Matters Section (Cross-Business) */}
            <div className="mt-12">
                 <h3 className="text-lg font-bold text-red-200 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Critical Attention Required
                </h3>
                <div className="bg-slate-900 rounded-xl border border-red-900/30 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-3">Business</th>
                                <th className="px-6 py-3">Folder</th>
                                <th className="px-6 py-3 text-center">Overdue</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                             {projects.filter(p => p.stats.overdueTasks > 0).length === 0 ? (
                                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No urgent matters detected.</td></tr>
                             ) : (
                                projects
                                .filter(p => p.stats.overdueTasks > 0)
                                .sort((a, b) => b.stats.overdueTasks - a.stats.overdueTasks)
                                .slice(0, 5) // Top 5 only
                                .map(p => {
                                    const parentSpace = spaces.find(s => s.id === p.spaceName);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-800/50">
                                            <td className="px-6 py-3 font-medium text-slate-200">{parentSpace?.name || 'Unknown'}</td>
                                            <td className="px-6 py-3">{p.name}</td>
                                            <td className="px-6 py-3 text-center text-red-400 font-bold">{p.stats.overdueTasks}</td>
                                            <td className="px-6 py-3 text-right">
                                                 <button onClick={() => onNavigateToProject(p)} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">View Details</button>
                                            </td>
                                        </tr>
                                    );
                                })
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HomeOverview;
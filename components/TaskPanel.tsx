import React, { useMemo, useState } from 'react';
import { ClickUpTask, ProjectData } from '../types';

interface TaskPanelProps {
    project: ProjectData | null;
    onClose: () => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ project, onClose }) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'comments'>('tasks');
    const [filter, setFilter] = useState<'all' | 'open' | 'overdue'>('all');

    const filteredTasks = useMemo(() => {
        if (!project || !project.tasks) return [];
        const now = Date.now();
        return project.tasks.filter(task => {
            if (!task.status) return false;
            
            const isClosed = task.status.type === 'closed';
            const dueDate = task.due_date ? parseInt(task.due_date, 10) : null;
            
            if (filter === 'open') return !isClosed;
            if (filter === 'overdue') return !isClosed && dueDate && dueDate < now;
            return true;
        });
    }, [project, filter]);

    const formatTimeAgo = (timestampStr: string) => {
        const timestamp = parseInt(timestampStr, 10);
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        let interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    };

    if (!project) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-800 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900">
                <div>
                    <h2 className="text-xl font-bold text-slate-100">{project.name}</h2>
                    <div className="flex gap-3 text-sm text-slate-400 mt-1">
                        <span>{project.stats.openTasks} Open</span>
                        <span className="text-slate-600">•</span>
                        <span className={project.stats.overdueTasks > 0 ? 'text-red-400 font-medium' : ''}>{project.stats.overdueTasks} Overdue</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button 
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Tasks ({filteredTasks.length})
                </button>
                <button 
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'comments' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Recent Activity
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-950">
                {activeTab === 'tasks' ? (
                    <div className="p-6 space-y-4">
                        <div className="flex gap-2 mb-4">
                            {(['all', 'open', 'overdue'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors border ${
                                        filter === f 
                                        ? 'bg-cyan-900/30 text-cyan-200 border-cyan-800' 
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {filteredTasks.length === 0 ? (
                            <div className="text-center text-slate-500 py-12">
                                No tasks found in this view.
                            </div>
                        ) : (
                            filteredTasks.map(task => {
                                const dueDate = task.due_date ? new Date(parseInt(task.due_date, 10)) : null;
                                const isOverdue = dueDate && dueDate.getTime() < Date.now() && task.status.type !== 'closed';

                                return (
                                    <div key={task.id} className="p-4 border border-slate-800 rounded-lg hover:border-cyan-800 transition-colors bg-slate-900 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-slate-200 text-sm leading-snug flex-1 mr-2">{task.name}</h4>
                                            <span 
                                                className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider"
                                                style={{ backgroundColor: task.status.color, color: '#fff', textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}
                                            >
                                                {task.status.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2">
                                                {task.assignees && task.assignees.length > 0 ? (
                                                    <div className="flex -space-x-2">
                                                        {task.assignees.map(a => (
                                                            <img 
                                                                key={a.id} 
                                                                src={a.profilePicture || `https://ui-avatars.com/api/?name=${a.username}&background=random`} 
                                                                alt={a.username}
                                                                className="w-6 h-6 rounded-full border-2 border-slate-900"
                                                                title={a.username}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic">Unassigned</span>
                                                )}
                                            </div>
                                            <div className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {dueDate ? dueDate.toLocaleDateString() : 'No Date'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="p-6">
                         {!project.recentComments || project.recentComments.length === 0 ? (
                            <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                                <svg className="w-10 h-10 text-slate-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p>No recent comments fetched.</p>
                                <p className="text-xs text-slate-600 mt-2">Comments are only fetched for recently updated tasks.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {project.recentComments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <div className="flex-shrink-0">
                                            <img 
                                                src={comment.user.profilePicture || `https://ui-avatars.com/api/?name=${comment.user.username}`} 
                                                alt={comment.user.username}
                                                className="w-8 h-8 rounded-full border border-slate-700"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-semibold text-slate-200">{comment.user.username}</span>
                                                <span className="text-xs text-slate-500">{formatTimeAgo(comment.date)}</span>
                                            </div>
                                            <div className="text-xs text-cyan-400 mb-1 font-medium bg-cyan-900/20 inline-block px-1.5 py-0.5 rounded border border-cyan-900/30">
                                                Task: {comment.task_name || 'Unknown Task'}
                                            </div>
                                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                {comment.comment_text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskPanel;
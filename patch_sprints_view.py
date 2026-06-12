import os

file_path = r"c:\Users\HP\Desktop\Dev\Vector\myVector\src\pages\goals\SprintsView.tsx"

# Read SprintsView.tsx with UTF-8 replacement for any invalid bytes
with open(file_path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

# Normalize line endings to LF (\n) to ensure clean matching
content = content.replace("\r\n", "\n")

# ── TARGET 1: Selected Sprint Header & Backlog Control ────────────────────────
old_header_backlog = """               {/* TOP HEADER / STATUS */}
               <div className="p-6 md:p-8 border-b border-white/5 relative overflow-hidden bg-black/20">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                     <div className="flex-1 min-w-0 space-y-3.5">
                        <div className="flex items-center gap-2">
                           <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/60">
                              {selectedSprint.status}
                           </span>
                           {selectedSprint.status === 'active' && (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                                 <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00dbe9]" /> Live_Ops
                              </span>
                           )}
                        </div>
                        
                        <div>
                           <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-0.5">Current Sprint</span>
                           <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight truncate leading-none">{selectedSprint.name}</h3>
                        </div>
 
                        {selectedSprint.objective && (
                           <div>
                              <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-0.5">Sprint Goal</span>
                              <div className="flex items-center gap-1.5 text-on-surface">
                                 <Target size={10} className="text-primary/60" />
                                 <span className="font-headline font-bold text-[9px] uppercase tracking-widest leading-none">{selectedSprint.objective}</span>
                              </div>
                           </div>
                        )}
 
                        <div>
                           <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-0.5">Time Remaining</span>
                           <span className="text-xs font-headline font-black text-secondary uppercase tracking-widest tabular-nums leading-none">
                              {daysRemaining(selectedSprint.endDate)} Days Left
                           </span>
                        </div>
                     </div>
 
                     <div className="w-full md:w-[320px] flex flex-col justify-between gap-5 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-8">
                        {/* Sprint Completion Progress */}
                        <div className="space-y-2">
                           <div className="flex justify-between items-end">
                              <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Sprint Completion</span>
                              <span className="text-[9px] font-headline font-black text-primary tabular-nums leading-none">{progress}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-700 shadow-[0_0_10px_rgba(0,219,233,0.4)]" style={{ width: `${progress}%` }} />
                           </div>
                        </div>
 
                        {/* Controls & Filters */}
                        <div className="flex items-center justify-between gap-3">
                           {/* Focus Toggle (filters) */}
                           <button onClick={() => setFocusMode(!focusMode)}
                                   className={`px-3 py-1.5 rounded-xl border text-[8px] font-headline font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${focusMode ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/5 text-on-surface-variant/60 hover:text-on-surface hover:border-white/10'}`}>
                              <Target size={10} className={focusMode ? 'text-black' : 'text-primary'} />
                              {focusMode ? 'Focus On' : 'Filter Focus'}
                           </button>
 
                           {/* View Mode Switcher */}
                           <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/5 shrink-0">
                              <button onClick={() => setTaskViewMode('list')} className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${taskViewMode === 'list' ? 'bg-primary text-black' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>
                                 <ListTodo size={10} /> List
                              </button>
                              <button onClick={() => setTaskViewMode('kanban')} className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${taskViewMode === 'kanban' ? 'bg-primary text-black' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>
                                 <LayoutGrid size={10} /> Kanban
                              </button>
                           </div>
                        </div>
 
                        {/* Action items: Complete / Initialize */}
                        <div className="flex items-center gap-2">
                           {selectedSprint.status === 'planned' ? (
                              <button onClick={() => db.sprints.update(selectedSprint.id!, { status: 'active', updatedAt: Date.now() })}
                                      className="flex-1 py-1.5 bg-primary text-black rounded-lg font-headline font-black text-[8px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                                 Initialize
                              </button>
                           ) : (
                              <button onClick={() => db.sprints.update(selectedSprint.id!, { status: selectedSprint.status === 'done' ? 'active' : 'done', updatedAt: Date.now() })}
                                      className={`flex-1 py-1.5 rounded-lg font-headline font-black text-[8px] uppercase tracking-widest transition-all ${selectedSprint.status === 'done' ? 'bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20' : 'bg-secondary text-black shadow-lg hover:scale-[1.02] active:scale-95'}`}>
                                 {selectedSprint.status === 'done' ? 'Reopen' : 'Complete'}
                              </button>
                           )}
                           <button onClick={() => deleteSprint(selectedSprint.id)} 
                                   className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[8px] font-headline font-black uppercase tracking-widest text-on-surface-variant/30 hover:text-error hover:border-error/20 transition-all">
                              Purge
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
 
              
 
               {/* TASK CONTROL AREA */}
               <div className="p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                     <div className="flex-1 max-w-2xl bg-white/[0.03] border border-white/5 rounded-[14px] p-1 flex items-center gap-2">
                        <div className="flex gap-0.5 p-0.5 bg-black/40 rounded-lg border border-white/5">
                           {PRIORITIES.map(p => (
                              <button key={p} onClick={() => setNewTaskPri(p)}
                                      className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${newTaskPri === p ? PRI_COLORS[p] : 'text-on-surface-variant/20 hover:text-on-surface-variant'}`}>
                                 {p}
                              </button>
                           ))}
                        </div>
                        <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                               placeholder="Directive identifier..."
                               className="flex-1 bg-transparent border-none outline-none font-headline font-bold text-xs text-on-surface placeholder:text-on-surface-variant/20 px-2" />
                        <button onClick={addTask} className="w-10 h-10 rounded-lg bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                           <Plus size={18} />
                        </button>
                     </div>
                  </div>"""

new_header_backlog = """               {/* TOP HEADER / STATUS */}
               <div className="p-6 md:p-8 border-b border-white/5 relative overflow-hidden bg-black/20">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     {/* Left side: Current Sprint and Sprint Goal */}
                     <div className="space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-headline font-bold text-on-surface-variant/40 tracking-wider block lowercase">
                              current sprint / {selectedSprint.name}
                           </span>
                           <span className={`px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/5 text-[7px] font-headline font-bold uppercase tracking-wider ${selectedSprint.status === 'active' ? 'text-primary border-primary/20 bg-primary/5' : 'text-on-surface-variant/50'}`}>
                              {selectedSprint.status}
                           </span>
                        </div>
                        <h2 className="font-headline font-black text-base text-primary tracking-wide uppercase">
                           {selectedSprint.objective || 'No goal set'}
                        </h2>
                     </div>
                     
                     {/* Right side: Sprint Completion progress bar, days left and toggle switcher */}
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-headline font-bold text-on-surface-variant/40 tracking-wider block lowercase">sprint completion</span>
                              <span className="text-xs font-semibold text-primary tabular-nums">{progress}%</span>
                           </div>
                           <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-700 shadow-[0_0_8px_rgba(0,219,233,0.3)]" style={{ width: `${progress}%` }} />
                           </div>
                        </div>
                        
                        <div className="flex justify-between items-center gap-4">
                           {/* Days left and Action buttons */}
                           <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-secondary lowercase">
                                 {daysRemaining(selectedSprint.endDate)} days left
                              </span>
                              
                              {/* Status action */}
                              {selectedSprint.status === 'planned' ? (
                                 <button onClick={() => db.sprints.update(selectedSprint.id!, { status: 'active', updatedAt: Date.now() })}
                                         className="px-2.5 py-0.5 rounded-[3px] bg-primary/20 border border-primary/30 text-primary text-[8px] font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all">
                                    initialize
                                 </button>
                              ) : (
                                 <button onClick={() => db.sprints.update(selectedSprint.id!, { status: selectedSprint.status === 'done' ? 'active' : 'done', updatedAt: Date.now() })}
                                         className={`px-2.5 py-0.5 rounded-[3px] text-[8px] font-bold uppercase tracking-wider transition-all ${selectedSprint.status === 'done' ? 'bg-secondary/15 border border-secondary/30 text-secondary' : 'bg-secondary text-black hover:scale-[1.02]'}`}>
                                    {selectedSprint.status === 'done' ? 'reopen' : 'complete'}
                                 </button>
                              )}
                              
                              <button onClick={() => deleteSprint(selectedSprint.id)}
                                      className="px-2.5 py-0.5 rounded-[3px] bg-error/15 border border-error/30 text-error text-[8px] font-bold uppercase tracking-wider hover:bg-error hover:text-white transition-all">
                                 purge
                              </button>
                           </div>
                           
                           {/* list | kanban switcher */}
                           <div className="flex bg-black/60 p-0.5 rounded-[4px] border border-white/5">
                              <button 
                                 onClick={() => setTaskViewMode('list')} 
                                 className={`px-3 py-1.5 rounded-[3px] text-[9px] font-bold lowercase transition-all ${taskViewMode === 'list' ? 'bg-primary text-black' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
                              >
                                 list
                              </button>
                              <button 
                                 onClick={() => setTaskViewMode('kanban')} 
                                 className={`px-3 py-1.5 rounded-[3px] text-[9px] font-bold lowercase transition-all ${taskViewMode === 'kanban' ? 'bg-primary text-black' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
                              >
                                 kanban
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* TASK CONTROL AREA */}
               <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-3">
                        <h3 className="font-headline font-black text-xs text-on-surface/40 uppercase tracking-[0.2em]">sprint backlog</h3>
                        
                        {/* Filter Buttons */}
                        <button 
                           onClick={() => setFocusMode(!focusMode)}
                           className={`px-3 py-1 rounded-full border text-[8px] font-headline font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${focusMode ? 'bg-primary border-primary text-black font-black' : 'bg-[#242730] border-white/5 text-on-surface-variant/60 hover:text-on-surface'}`}
                        >
                           {focusMode ? 'focus on' : 'filter focus'}
                        </button>
                        
                        <button className="px-3 py-1 rounded-full border text-[8px] font-headline font-bold uppercase tracking-wider bg-[#242730] border-white/5 text-on-surface-variant/40 hover:text-on-surface">
                           all priorities
                        </button>
                     </div>
                     
                     {!isAddingTask && (
                        <button 
                           onClick={() => setIsAddingTask(true)} 
                           className="w-7 h-7 rounded-[4px] bg-[#242730] border border-white/5 hover:border-primary/30 hover:text-primary flex items-center justify-center transition-all cursor-pointer"
                           title="Add Task Directive"
                        >
                           <Plus size={14} />
                        </button>
                     )}
                  </div>

                  {isAddingTask && (
                     <div className="flex items-center gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex-1 max-w-2xl bg-[#242730] border border-white/5 rounded-[6px] p-1.5 flex items-center gap-2 shadow-inner">
                           <div className="flex gap-0.5 p-0.5 bg-black/60 rounded-[4px] border border-white/5">
                              {PRIORITIES.map(p => (
                                 <button key={p} onClick={() => setNewTaskPri(p)}
                                         className={`px-3 py-1.5 rounded-[3px] text-[8px] font-headline font-black uppercase tracking-[0.25em] transition-all ${newTaskPri === p ? PRI_COLORS[p] : 'text-on-surface-variant/20 hover:text-on-surface-variant'}`}>
                                    {p}
                                 </button>
                              ))}
                           </div>
                           <input 
                              autoFocus
                              value={newTaskLabel} 
                              onChange={e => setNewTaskLabel(e.target.value)} 
                              onKeyDown={async (e) => {
                                 if (e.key === 'Enter') {
                                    await addTask();
                                    setIsAddingTask(false);
                                 }
                              }}
                              placeholder="Directive identifier..."
                              className="flex-1 bg-transparent border-none outline-none font-headline font-black text-xs text-primary placeholder:text-on-surface-variant/15 px-2 uppercase tracking-wider" 
                           />
                           <button 
                              onClick={async () => {
                                 await addTask();
                                 setIsAddingTask(false);
                              }} 
                              className="w-9 h-9 rounded-[6px] bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                           >
                              <Plus size={16} />
                           </button>
                        </div>
                        <button 
                           onClick={() => {
                              setNewTaskLabel('');
                              setIsAddingTask(false);
                           }} 
                           className="text-[9px] font-headline font-black text-on-surface-variant/40 hover:text-error uppercase tracking-[0.2em] transition-colors cursor-pointer"
                        >
                           Cancel
                        </button>
                     </div>
                  )}"""

content = content.replace(old_header_backlog, new_header_backlog)


# ── TARGET 2: Kanban column flex -> grid conversion ─────────────────────────
old_column_flex = """                      ) : (
                          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar min-h-[500px]">
                             <KanbanColumn id="pending" title="To Do" tasks={displayTasks.filter(t => t.status === 'pending')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} />"""

new_column_grid = """                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 min-h-[500px]">
                             <KanbanColumn id="pending" title="to do" tasks={displayTasks.filter(t => t.status === 'pending')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} />"""

content = content.replace(old_column_flex, new_column_grid)

old_column_remaining = """                             <KanbanColumn id="active" title="In Progress" tasks={displayTasks.filter(t => t.status === 'active')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} />
                             <KanbanColumn id="done" title="Done" tasks={displayTasks.filter(t => t.status === 'done')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} />
                          </div>"""

new_column_remaining = """                             <KanbanColumn id="active" title="in progress" tasks={displayTasks.filter(t => t.status === 'active')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} />
                             <KanbanColumn id="done" title="done" tasks={displayTasks.filter(t => t.status === 'done')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} />
                          </div>"""

content = content.replace(old_column_remaining, new_column_remaining)


# ── TARGET 3: KanbanColumn, TaskItem Redesign ───────────────────────────────
old_components = """function KanbanColumn({ id, title, tasks, toggleTask, deleteTask, sessions, quarterlyGoals, toggleFocus }: { id: string, title: string, tasks: Task[], toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void, sessions: FocusSession[], quarterlyGoals: QuarterlyGoal[], toggleFocus: (t: Task)=>void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="flex flex-col w-[300px] shrink-0 bg-black/20 rounded-[14px] border border-white/5 overflow-hidden">
       <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#111318]">
          <span className="font-headline font-black text-[10px] uppercase tracking-widest text-primary/60">{title}</span>
          <span className="bg-primary/10 px-2 py-0.5 rounded text-[9px] font-black text-primary border border-primary/20">{tasks.length}</span>
       </div>
       <div ref={setNodeRef} className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar min-h-[150px]">
          <SortableContext items={tasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
            {tasks.map(t => {
               const tSessions = sessions.filter(s => s.taskId === t.id);
               const tSecs = tSessions.reduce((acc, s) => acc + s.actualSecs, 0);
               const hoursStr = tSecs > 0 ? `${(tSecs / 3600).toFixed(1)} hrs` : '0.0 hrs';

               const qg = quarterlyGoals.find(g => g.id === t.quarterlyGoalId);
               const tagStr = qg ? qg.title : undefined;

               return (
                  <SortableTaskItem 
                     key={t.id} 
                     task={t} 
                     toggleTask={toggleTask} 
                     deleteTask={deleteTask} 
                     viewMode="kanban" 
                     isNextActive={false} 
                     hoursSpent={hoursStr}
                     goalTag={tagStr}
                     toggleFocus={toggleFocus}
                  />
               );
            })}
          </SortableContext>
       </div>
    </div>
  )
}

function TaskItem({
  task,
  toggleTask,
  deleteTask,
  isNextActive,
  viewMode,
  hoursSpent,
  goalTag,
  dragHandleProps,
  innerRef,
  style,
  isOverlay,
  toggleFocus,
}: {
  task: Task;
  toggleTask: (t: Task) => void;
  deleteTask: (id: number) => void;
  isNextActive: boolean;
  viewMode: 'list' | 'kanban';
  hoursSpent: string;
  goalTag?: string;
  dragHandleProps?: any;
  innerRef?: any;
  style?: any;
  isOverlay?: boolean;
  toggleFocus?: (t: Task) => void;
}) {
  const priorityColor = PRI_COLORS[task.priority] ?? PRI_COLORS.LOW;

  if (viewMode === 'kanban') {
    return (
      <div ref={innerRef} style={style} {...dragHandleProps}
           className={`p-5 rounded-[14px] border bg-[#1a1c22] shadow-lg group transition-all ${isOverlay ? 'cursor-grabbing border-primary/60 scale-[1.02] shadow-primary/10' : 'cursor-grab border-white/5 hover:border-primary/40 hover:-translate-y-1 hover:shadow-primary/5'} ${task.status === 'done' ? 'border-secondary/20 opacity-60' : ''}`}>
         <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
               <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" style={{ color: task.status === 'done' ? '#00e475' : '#00dbe9' }} />
               <span className={`font-headline font-bold text-[11px] uppercase tracking-widest truncate ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{task.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
               <button onClick={(e) => { e.stopPropagation(); toggleFocus?.(task); }}
                       className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border ${task.dailyFocus ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,219,233,0.3)] animate-pulse' : 'bg-white/5 border-transparent text-on-surface-variant/30 hover:border-white/10 hover:text-on-surface opacity-0 group-hover:opacity-100'}`}>
                  <Target size={10} />
               </button>
               <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest tabular-nums">{hoursSpent}</span>
            </div>
         </div>
         
         {goalTag && (
            <div className="mb-4">
               <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded truncate block max-w-full" title={goalTag}>
                  {goalTag}
               </span>
            </div>
         )}

         <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
            <span className={`text-[7px] rounded-md font-black uppercase tracking-widest px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={(e) => { e.stopPropagation(); toggleTask(task); }} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-secondary text-black' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black'}`}><Check size={12}/></button>
               <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id!); }} className="w-7 h-7 rounded-lg bg-error/10 text-error flex items-center justify-center border border-error/20 hover:bg-error hover:text-white transition-all"><Trash2 size={12}/></button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div ref={innerRef} style={style} className={`flex items-center justify-between px-6 py-4 rounded-[14px] group transition-all duration-300 relative bg-[#111318] border border-white/5 ${task.status === 'done' ? 'opacity-40 border-dashed bg-[#111318]/10' : isNextActive ? 'border-primary/40 bg-primary/5' : 'hover:border-white/20'} ${isOverlay ? 'scale-[1.01] border-primary/60 shadow-lg' : ''}`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div {...dragHandleProps} className="cursor-grab text-on-surface-variant/10 hover:text-primary transition-colors touch-none">
           <GripVertical size={14} />
        </div>
        <div onClick={() => toggleTask(task)} className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary' : isNextActive ? 'border-primary shadow-[0_0_8px_rgba(0,219,233,0.4)]' : 'border-white/10 group-hover:border-primary/50'}`}>
          {task.status === 'done' ? <Check size={12} className="text-black" /> : isNextActive ? <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> : null}
        </div>
        <div className={`font-headline font-black text-[11px] uppercase tracking-widest truncate flex items-center gap-2 ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : isNextActive ? 'text-primary' : 'text-on-surface'}`}>
          {task.label}
          {isNextActive && <span className="text-[6px] px-1.5 py-0.5 rounded bg-primary text-black font-black tracking-widest uppercase">Target</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {goalTag && <span className="text-[7px] font-black text-primary/40 uppercase tracking-widest mr-2 truncate max-w-[120px]" title={goalTag}>{goalTag}</span>}
        <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest tabular-nums mr-2">{hoursSpent}</span>
        <button onClick={(e) => { e.stopPropagation(); toggleFocus?.(task); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${task.dailyFocus ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,219,233,0.3)] animate-pulse' : 'bg-white/5 border-transparent text-on-surface-variant/30 hover:border-white/10 hover:text-on-surface opacity-0 group-hover:opacity-100'}`}>
           <Target size={12} />
        </button>
        <span className={`text-[7px] rounded-md font-black uppercase tracking-widest px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
        <button onClick={() => deleteTask(task.id!)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/10 hover:bg-error/10 hover:text-error transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-error/20">
          <Trash2 size={12} />
        </button>
      </div>
    </div>"""

new_components = """function KanbanColumn({ id, title, tasks, toggleTask, deleteTask, sessions, quarterlyGoals, toggleFocus }: { id: string, title: string, tasks: Task[], toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void, sessions: FocusSession[], quarterlyGoals: QuarterlyGoal[], toggleFocus: (t: Task)=>void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="flex flex-col w-full bg-[#111318]/40 border border-white/5 rounded-[8px] overflow-hidden">
       <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1a1c22]/40 backdrop-blur-md">
          <span className="font-headline font-black text-[9px] uppercase tracking-[0.35em] text-primary/60">{title.toLowerCase()}</span>
          <span className="bg-primary/10 px-2 py-0.5 rounded-[2px] text-[8px] font-headline font-black text-primary border border-primary/20">{tasks.length}</span>
       </div>
       <div ref={setNodeRef} className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar min-h-[150px]">
          <SortableContext items={tasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
            {tasks.map(t => {
               const tSessions = sessions.filter(s => s.taskId === t.id);
               const tSecs = tSessions.reduce((acc, s) => acc + s.actualSecs, 0);
               const hoursStr = tSecs > 0 ? `${(tSecs / 3600).toFixed(1)} hrs` : '0.0 hrs';

               const qg = quarterlyGoals.find(g => g.id === t.quarterlyGoalId);
               const tagStr = qg ? qg.title : undefined;

               return (
                  <SortableTaskItem 
                     key={t.id} 
                     task={t} 
                     toggleTask={toggleTask} 
                     deleteTask={deleteTask} 
                     viewMode="kanban" 
                     isNextActive={false} 
                     hoursSpent={hoursStr}
                     goalTag={tagStr}
                     toggleFocus={toggleFocus}
                  />
               );
            })}
          </SortableContext>
       </div>
    </div>
  )
}

function TaskItem({
  task,
  toggleTask,
  deleteTask,
  isNextActive,
  viewMode,
  hoursSpent,
  goalTag,
  dragHandleProps,
  innerRef,
  style,
  isOverlay,
  toggleFocus,
}: {
  task: Task;
  toggleTask: (t: Task) => void;
  deleteTask: (id: number) => void;
  isNextActive: boolean;
  viewMode: 'list' | 'kanban';
  hoursSpent: string;
  goalTag?: string;
  dragHandleProps?: any;
  innerRef?: any;
  style?: any;
  isOverlay?: boolean;
  toggleFocus?: (t: Task) => void;
}) {
  const priorityColor = PRI_COLORS[task.priority] ?? PRI_COLORS.LOW;

  if (viewMode === 'kanban') {
    return (
      <div ref={innerRef} style={style}
           className={`p-3.5 rounded-[6px] border bg-[#1a1c22]/50 shadow-md group transition-all relative ${isOverlay ? 'border-primary/60 scale-[1.02] shadow-primary/10 bg-[#1a1c22]' : 'border-white/5 hover:border-primary/30 hover:bg-[#1a1c22]/70'} ${task.status === 'done' ? 'border-secondary/20 opacity-60 bg-[#111318]/20' : ''}`}>
        
        {/* Top row: Grip handle, Check toggle, Label, and Hours spent */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
             <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-on-surface-variant/20 hover:text-primary transition-colors touch-none py-0.5 flex-shrink-0">
                <GripVertical size={12} />
             </div>
             <button onClick={() => toggleTask(task)} className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center border transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary' : 'border-white/20 group-hover:border-primary/50'}`}>
                {task.status === 'done' ? <Check size={8} className="text-black" /> : null}
             </button>
             <span className={`font-headline font-black text-[10px] uppercase tracking-[0.2em] truncate ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`} title={task.label}>
                {task.label}
             </span>
          </div>
          <span className="text-[8px] font-headline font-black text-on-surface-variant/40 uppercase tracking-[0.15em] tabular-nums mt-0.5 shrink-0">
             {hoursSpent}
          </span>
        </div>

        {/* Bottom row: Goal tag and Priority + buttons on hover */}
        <div className="flex justify-between items-center gap-2 mt-4 pt-3 border-t border-white/5">
          {goalTag ? (
             <span className="text-[7px] font-headline font-black text-primary/60 uppercase tracking-[0.2em] bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-[2px] truncate max-w-[120px]" title={goalTag}>
                {goalTag}
             </span>
          ) : (
             <div />
          )}

          <div className="flex items-center gap-1.5">
             {/* Target Focus button */}
             <button onClick={(e) => { e.stopPropagation(); toggleFocus?.(task); }}
                     className={`w-6 h-6 rounded-[2px] flex items-center justify-center transition-all border ${task.dailyFocus ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,219,233,0.3)] animate-pulse' : 'bg-[#242730] border-transparent text-on-surface-variant/30 hover:border-white/10 hover:text-on-surface opacity-0 group-hover:opacity-100'}`}>
                <Target size={10} />
             </button>
             
             {/* Priority indicator */}
             <span className={`text-[7px] rounded-[2px] font-black uppercase tracking-[0.25em] px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
             
             {/* Delete button (hover only) */}
             <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id!); }}
                     className="w-6 h-6 rounded-[2px] bg-error/10 text-error flex items-center justify-center border border-error/20 hover:bg-error hover:text-white transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={10} />
             </button>
          </div>
        </div>
     </div>
    );
  }

  return (
    <div ref={innerRef} style={style} className={`flex items-center justify-between px-4 py-3 rounded-[6px] group transition-all duration-300 relative bg-[#111318]/30 border border-white/5 ${task.status === 'done' ? 'opacity-40 border-dashed bg-[#111318]/10' : isNextActive ? 'border-primary/40 bg-primary/5' : 'hover:border-white/10'} ${isOverlay ? 'scale-[1.01] border-primary/60 shadow-lg bg-[#111318]' : ''}`}>
      {/* Left side: Grip, Check, Task Label + Goal tag below it */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div {...dragHandleProps} className="cursor-grab text-on-surface-variant/10 hover:text-primary transition-colors touch-none">
           <GripVertical size={12} />
        </div>
        <div onClick={() => toggleTask(task)} className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary' : isNextActive ? 'border-primary shadow-[0_0_8px_rgba(0,219,233,0.4)]' : 'border-white/10 group-hover:border-primary/50'}`}>
          {task.status === 'done' ? <Check size={10} className="text-black" /> : isNextActive ? <div className="w-1 h-1 rounded-full bg-primary animate-pulse" /> : null}
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className={`font-headline font-black text-[10px] uppercase tracking-[0.2em] truncate flex items-center gap-2 ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : isNextActive ? 'text-primary' : 'text-on-surface'}`}>
            {task.label}
            {isNextActive && <span className="text-[6px] px-1.5 py-0.5 rounded-[1px] bg-primary text-black font-black tracking-[0.15em] uppercase">Target</span>}
          </div>
          {goalTag && (
            <span className="text-[7.5px] font-headline font-bold text-primary/50 uppercase tracking-[0.15em] mt-0.5 truncate block" title={goalTag}>
              {goalTag}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Priority, Hours, Focus toggles, Delete button */}
      <div className="flex items-center gap-2.5 shrink-0 ml-4">
        <span className="text-[8px] font-headline font-black text-on-surface-variant/40 uppercase tracking-[0.15em] tabular-nums mr-1.5">{hoursSpent}</span>
        
        {/* Focus Toggle */}
        <button onClick={(e) => { e.stopPropagation(); toggleFocus?.(task); }}
                className={`w-7 h-7 rounded-[2px] flex items-center justify-center transition-all border ${task.dailyFocus ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,219,233,0.3)] animate-pulse' : 'bg-[#242730] border-transparent text-on-surface-variant/30 hover:border-white/10 hover:text-on-surface opacity-0 group-hover:opacity-100'}`}>
           <Target size={10} />
        </button>
        
        {/* Priority */}
        <span className={`text-[7px] rounded-[2px] font-black uppercase tracking-[0.25em] px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
        
        {/* Delete */}
        <button onClick={() => deleteTask(task.id!)}
          className="w-7 h-7 rounded-[4px] flex items-center justify-center text-on-surface-variant/10 hover:bg-error/10 hover:text-error transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-error/20">
          <Trash2 size={12} />
        </button>
      </div>
    </div>"""

content = content.replace(old_components, new_components)

# Write back in clean UTF-8
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch complete successfully!")

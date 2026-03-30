import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'

export default function Tasks({ clientId }) {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Renouvellement Auto', priority: 'high', dueDate: '2026-04-15', completed: false },
    { id: 2, title: 'Cross-sell habitation', priority: 'medium', dueDate: '2026-04-20', completed: false }
  ])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState('medium')

  const addTask = () => {
    if (!newTask.trim()) return
    setTasks([...tasks, {
      id: Date.now(),
      title: newTask,
      priority,
      dueDate: new Date().toISOString().split('T')[0],
      completed: false
    }])
    setNewTask('')
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id))
  }

  const pendingTasks = tasks.filter(t => !t.completed)

  return (
    <div className="glass p-6 rounded-lg">
      <h3 className="text-xl font-bold text-cyan mb-4">Tâches ({pendingTasks.length})</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Ajouter une tâche..."
          className="input-field flex-1"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
        />
        <select 
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="input-field w-24"
        >
          <option value="low">Basse</option>
          <option value="medium">Moy.</option>
          <option value="high">Haute</option>
        </select>
        <button onClick={addTask} className="btn-primary">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div 
            key={task.id}
            className={`p-3 rounded-lg flex items-center justify-between ${
              task.completed ? 'bg-green-500/10 border border-green-500' : 'bg-dark-3 border border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                  task.completed ? 'bg-green-500 border-green-500' : 'border-slate-500'
                }`}
              >
                {task.completed && <Check size={16} className="text-white" />}
              </button>
              <div className="flex-1">
                <p className={task.completed ? 'line-through text-slate-500' : 'text-cyan'}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-500">{task.dueDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded font-bold ${
                task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {task.priority}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-red-400 hover:bg-red-500/20 p-2 rounded transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

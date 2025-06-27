import React from 'react';
import { MapPin, Ruler, Activity, Mountain, CheckCircle, Clock, Circle } from 'lucide-react';
import type { Site, TodoStatus } from '../../types';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: TodoStatus;
  onClick: () => void;
}

interface SiteTodoListProps {
  site: Site;
  onTodoClick: (todoType: 'site_info' | 'cross_section' | 'velocity' | 'sediment') => void;
}

const getStatusColor = (status: TodoStatus): string => {
  switch (status) {
    case 'not_started':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'complete':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

const getStatusIcon = (status: TodoStatus) => {
  switch (status) {
    case 'not_started':
      return Circle;
    case 'in_progress':
      return Clock;
    case 'complete':
      return CheckCircle;
    default:
      return Circle;
  }
};

const getStatusText = (status: TodoStatus): string => {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'complete':
      return 'Complete';
    default:
      return 'Not Started';
  }
};

export function SiteTodoList({ site, onTodoClick }: SiteTodoListProps) {
  const todos: TodoItem[] = [
    {
      id: 'site_info',
      title: 'Site Information',
      description: 'Record site details, location, weather, and land use',
      icon: MapPin,
      status: site.todo_site_info_status,
      onClick: () => onTodoClick('site_info'),
    },
    {
      id: 'cross_section',
      title: 'Cross-Sectional Area',
      description: 'Measure river width and depth at multiple points',
      icon: Ruler,
      status: site.todo_cross_section_status,
      onClick: () => onTodoClick('cross_section'),
    },
    {
      id: 'velocity',
      title: 'Velocity Measurements',
      description: 'Time float travel to calculate water velocity',
      icon: Activity,
      status: site.todo_velocity_status,
      onClick: () => onTodoClick('velocity'),
    },
    {
      id: 'sediment',
      title: 'Sediment Analysis',
      description: 'Analyze sediment size and roundness samples',
      icon: Mountain,
      status: site.todo_sediment_status,
      onClick: () => onTodoClick('sediment'),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Site {site.site_number}</h3>
          <p className="text-muted-foreground">Complete the following tasks for this site</p>
        </div>
      </div>

      <div className="grid gap-3">
        {todos.map((todo) => {
          const StatusIcon = getStatusIcon(todo.status);
          const IconComponent = todo.icon;
          const statusColor = getStatusColor(todo.status);

          return (
            <button
              key={todo.id}
              onClick={todo.onClick}
              className="w-full text-left p-4 rounded-lg border-2 hover:border-primary/30 bg-white hover:shadow-md group task-button-morph"
            >
              <div className="flex items-center gap-4">
                {/* Todo Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>

                {/* Todo Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold text-foreground">{todo.title}</h4>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                      <StatusIcon className="w-3 h-3" />
                      {getStatusText(todo.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{todo.description}</p>
                </div>

                {/* Arrow indicator */}
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-sm font-medium text-blue-800">Site Progress</span>
        </div>
        
        {(() => {
          const completedCount = todos.filter(t => t.status === 'complete').length;
          const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
          const totalCount = todos.length;
          const progressPercent = (completedCount / totalCount) * 100;
          
          return (
            <>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-blue-700">Progress</span>
                <span className="font-medium text-blue-800">
                  {completedCount}/{totalCount} tasks complete
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-blue-700">{completedCount} complete</span>
                </span>
                {inProgressCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span className="text-blue-700">{inProgressCount} in progress</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-blue-700">{todos.filter(t => t.status === 'not_started').length} remaining</span>
                </span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
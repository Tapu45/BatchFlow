import { Plus, ArrowLeft } from 'lucide-react';
import useInitNavStackOnce from '../../../hooks/useSafeSetNavStack';
import ViewUnit from '../../ui/standard/unit/viewUnit';
import React, { useState } from 'react';
import AddUnit from '../../ui/standard/unit/AddUnit';
import StandardCategory from '../../ui/standard/stanadardCategory/StandardCategory';
import AddStandardCategory from '../../ui/standard/stanadardCategory/AddCategory';
import StandardParameterList from '../../ui/standard/standardParameters/standardParamlist';
import AddStandardParameter from '../../ui/standard/standardParameters/AddStandardParameter';
import { Folder, Package, Tag } from 'lucide-react';

interface TabConfig {
  title: string;
  content: React.ReactNode;
  addComponent: React.ReactNode;
  icon: React.ReactNode;
  description: string;
}

// Minimalistic, bold, slightly larger Tabs with border
const SimpleTabs: React.FC<{
  tabs: {
    title: string;
    content: React.ReactNode;
    icon?: React.ReactNode;
  }[];
  activeTab: number;
  onTabChange: (index: number) => void;
}> = ({ tabs, activeTab, onTabChange }) => (
  <div style={{ background: 'var(--card)' }} className="w-full">
    <div className="flex space-x-3 px-0 pb-2">
      {tabs.map((tab, idx) => (
        <button
          key={tab.title}
          onClick={() => onTabChange(idx)}
          className={`flex items-center gap-2 px-5 py-3 text-base font-extrabold rounded-t-lg transition-all duration-150 relative
            ${activeTab === idx
              ? 'text-[var(--primary)]'
              : 'text-[var(--foreground)] hover:text-[var(--primary)]'
            }
          `}
          style={{ background: 'var(--card)' }}
        >
          {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
          {tab.title}
          {activeTab === idx && (
            <span
              className="absolute left-0 right-0 -bottom-1 h-1 rounded-full"
              style={{ background: 'var(--primary)' }}
            />
          )}
        </button>
      ))}
    </div>
  </div>
);

export default function Standard() {
  useInitNavStackOnce([{ title: 'Standard', path: '/' }]);

  const [activeTab, setActiveTab] = useState(0);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [, setSelectedCategoryId] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    setSelectedCategoryId({ id: categoryId, name: categoryName });
    setActiveTab(1);
  };

  const handleAddClick = () => setShowAddComponent(true);
  const handleBackToList = () => setShowAddComponent(false);

  const tabIcons = {
    category: <Folder className="h-5 w-5" />,
    parameters: <Tag className="h-5 w-5" />,
    unit: <Package className="h-5 w-5" />,
  };

  const tabs: TabConfig[] = [
    {
      title: 'Categories',
      description: 'Manage standard categories',
      content: (
        <StandardCategory
          onCategorySelect={handleCategorySelect}
          onAddCategoryClick={handleAddClick}
        />
      ),
      addComponent: (
        <AddStandardCategory
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      ),
      icon: tabIcons.category,
    },
    {
      title: 'Parameters',
      description: 'Configure parameters',
      content: <StandardParameterList onAddParameterClick={handleAddClick} />,
      addComponent: (
        <AddStandardParameter
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      ),
      icon: tabIcons.parameters,
    },
    {
      title: 'Units',
      description: 'Measurement units',
      content: <ViewUnit />,
      addComponent: (
        <AddUnit onSuccess={handleBackToList} onCancel={handleBackToList} />
      ),
      icon: tabIcons.unit,
    },
  ];

  // Render add-component or tab content inline to avoid unused variables
  // (keeps logic local and avoids stale references)



  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }} className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Standards</h1>
        <p className="mt-1" style={{ color: 'var(--muted-foreground)' }}>Standard management overview</p>
      </div>
      {/* Tabs */}
      <SimpleTabs
        tabs={tabs.map(tab => ({
          title: tab.title,
          content: showAddComponent ? tab.addComponent : tab.content,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={(index) => {
          setActiveTab(index);
          setShowAddComponent(false);
        }}
      />
      <div className="flex-1 flex justify-start">
        <div className="w-full max-w-6xl" style={{ background: 'var(--card)', color: 'var(--foreground)', borderRadius: '16px' }}>
          {showAddComponent ? (
            <div>
              <div className="border-b border-border p-6 pb-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    {tabs[activeTab].icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground">
                      Add {tabs[activeTab].title.slice(0, -1)}
                    </h2>
                    <p className="text-sm mt-1 text-muted-foreground">
                      Create a new {tabs[activeTab].title.toLowerCase().slice(0, -1)} entry
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleBackToList}
                  className="py-2 px-5 border border-border text-base font-semibold rounded-lg flex items-center gap-2 bg-card text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={18} />
                  Back to List
                </button>
              </div>
              <div className="p-6">{tabs[activeTab].addComponent}</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ background: 'var(--card)', color: 'var(--foreground)' }}>
                {tabs[activeTab].content}
              </div>
              <button
                onClick={handleAddClick}
                className="fixed bottom-8 right-8 z-50 h-14 w-14 rounded-xl flex items-center justify-center shadow-lg transition-colors text-2xl"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                <Plus size={28} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

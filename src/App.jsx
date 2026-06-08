import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Building2, Map, MapPin, Tent, Trees, Home, 
  X, Plus, ChevronDown, Image as ImageIcon, 
  Send, Calendar, Clock, CheckCircle2, FileText, Loader2, AlertTriangle, HelpCircle,
  Edit3, Trash2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAxL8ejtFBr7m7OJ8gYgd1NpyluwGpiZgA",
  authDomain: "tanur-project-tracker.firebaseapp.com",
  projectId: "tanur-project-tracker",
  storageBucket: "tanur-project-tracker.firebasestorage.app",
  messagingSenderId: "1033537596014",
  appId: "1:1033537596014:web:88d2ea52b4ff5f08a9947f"
};

let app, auth, db, storage;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  console.error("Firebase init failed:", e);
}

// Derive a safe App ID for Canvas environments
const CANVAS_APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'tanur-tracker-default';

const uploadImageToStorage = async (base64Str, updateId, index) => {
  if (!storage) throw new Error("Storage not initialized");
  const imageRef = ref(storage, `artifacts/${CANVAS_APP_ID}/images/${updateId}_${index}.jpg`);
  await uploadString(imageRef, base64Str, 'data_url');
  return await getDownloadURL(imageRef);
};

const deleteImageFromStorage = async (url) => {
  if (!storage || !url) return;
  // Safely check if it resides in Firebase Storage before trying to delete
  if (url.includes("firebasestorage.googleapis.com")) {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn("Failed to delete storage file:", err);
    }
  }
};

const INITIAL_LOCAL_BODIES = [
  { id: 'tanur', name: 'Tanur Municipality', color: 'from-indigo-500 to-purple-600', theme: 'indigo', icon: Building2 },
  { id: 'ozhur', name: 'Ozhur', color: 'from-emerald-400 to-green-600', theme: 'emerald', icon: Trees },
  { id: 'cheriyamundam', name: 'Cheriyamundam', color: 'from-blue-400 to-cyan-600', theme: 'blue', icon: Map },
  { id: 'ponmundam', name: 'Ponmundam', color: 'from-amber-400 to-orange-500', theme: 'amber', icon: Tent },
  { id: 'tanalur', name: 'Tanalur', color: 'from-rose-400 to-pink-600', theme: 'rose', icon: Home },
  { id: 'niramaruthur', name: 'Niramaruthur', color: 'from-teal-400 to-emerald-500', theme: 'teal', icon: MapPin },
];

const THEME_MAP = {
  indigo: { light: 'bg-indigo-50 border-indigo-100', dark: 'bg-indigo-100/60 border-indigo-200', text: 'text-indigo-800' },
  emerald: { light: 'bg-emerald-50 border-emerald-100', dark: 'bg-emerald-100/60 border-emerald-200', text: 'text-emerald-800' },
  blue: { light: 'bg-blue-50 border-blue-100', dark: 'bg-blue-100/60 border-blue-200', text: 'text-blue-800' },
  amber: { light: 'bg-amber-50 border-amber-100', dark: 'bg-amber-100/60 border-amber-200', text: 'text-amber-800' },
  rose: { light: 'bg-rose-50 border-rose-100', dark: 'bg-rose-100/60 border-rose-200', text: 'text-rose-800' },
  teal: { light: 'bg-teal-50 border-teal-100', dark: 'bg-teal-100/60 border-teal-200', text: 'text-teal-800' },
};

const useLongPress = (callback, ms = 600) => {
  const timerRef = useRef();
  const isLongPress = useRef(false);

  const start = useCallback((e) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback(e);
    }, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const onClickHandler = useCallback((e, defaultClick) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (defaultClick) defaultClick(e);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onClickHandler
  };
};

const LongPressable = ({ onLongPress, onClick, children, className, as: Component = 'div' }) => {
  const longPressProps = useLongPress(onLongPress);
  return (
    <Component 
      className={className} 
      {...longPressProps} 
      onClick={(e) => longPressProps.onClickHandler(e, onClick)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onLongPress(e); }} 
    >
      {children}
    </Component>
  );
};

// Image Compression Utility (Crucial for keeping images tiny and fast)
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to 60% quality JPEG
      };
    };
  });
};

export default function App() {
  const [localBodies] = useState(INITIAL_LOCAL_BODIES);
  const [activeBody, setActiveBody] = useState(null);
  
  // Firebase & State Handlers
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Fallback Local Memory State (so the app works immediately if auth fails!)
  const [allProjects, setAllProjects] = useState([]); 
  const [localUpdates, setLocalUpdates] = useState([]); // Array of updates for local fallback

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Malayalam:wght@400;600;700&family=Sora:wght@300;400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    if (!auth) {
      setAuthError("Firebase not initialized correctly.");
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("Custom token failed, falling back to Anonymous Auth:", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
        setAuthError(null);
      } catch (error) {
        console.error("Auth Error:", error);
        setAuthError(error.code || error.message);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUser(usr);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || authError) return;

    const projectsRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects');
    
    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      const projectsData = [];
      snapshot.forEach(doc => {
        projectsData.push({ id: doc.id, ...doc.data() });
      });
      projectsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllProjects(projectsData);
    }, (error) => {
      console.error("Error fetching projects:", error);
    });

    return () => unsubscribeProjects();
  }, [user, authError]);

  const handleOpenBody = (body) => setActiveBody(body);
  const handleCloseBody = () => setActiveBody(null);

  const handleAddProject = async (bodyId, projectName) => {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const projectData = {
      id: projectId,
      localBodyId: bodyId,
      name: projectName,
      createdAt: new Date().toISOString(),
      updateCount: 0
    };

    if (!user || authError) {
      setAllProjects(prev => [projectData, ...prev]);
      return;
    }

    try {
      await setDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', projectId), projectData);
    } catch (err) {
      console.error("Error adding project:", err);
    }
  };

  const getProjectCount = (bodyId) => allProjects.filter(p => p.localBodyId === bodyId).length;

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col overflow-hidden" style={{ fontFamily: "'Sora', 'Noto Serif Malayalam', sans-serif" }}>
      {/* Header */}
      <header className="bg-white shadow-sm shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
            <Map className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-600" />
            Tanur Projects Tracker
          </h1>
          
          {authError ? (
            <button 
              onClick={() => setShowSetupGuide(true)}
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-sm animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Setup Needed
            </button>
          ) : (
            <span className="text-[10px] sm:text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-full">
              Connected to Cloud DB
            </span>
          )}
        </div>
      </header>

      {/* Auth Setup Guide Dialog Overlay */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowSetupGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-amber-500 mb-4">
              <AlertTriangle className="w-12 h-12" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900">Enable Anonymous Sign-In</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Your Firebase Auth settings are blocking guest logins. Please follow these simple steps to fix this:
            </p>
            
            <ol className="mt-4 space-y-3 text-xs text-slate-700 list-decimal pl-5 font-medium">
              <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">Firebase Console</a>.</li>
              <li>Go to your project <strong>tanur-project-tracker</strong>.</li>
              <li>Under the left menu, select <strong>Build</strong> &gt; <strong>Authentication</strong>.</li>
              <li>Click the <strong>Sign-in method</strong> tab.</li>
              <li>Click <strong>Add new provider</strong> and choose <strong>Anonymous</strong>.</li>
              <li>Toggle it to <strong>Enabled</strong> and click <strong>Save</strong>.</li>
            </ol>

            <button 
              onClick={() => setShowSetupGuide(false)}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <main className="flex-1 overflow-hidden px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-center items-center">
        {authError && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl max-w-7xl w-full flex justify-between items-center">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span><strong>Connected Anonymously:</strong> A custom token error occurred, but the system safely routed to Anonymous Sign-In to ensure a working connection!</span>
            </span>
          </div>
        )}

        <div className="max-w-7xl w-full grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {localBodies.map((body) => (
            <div 
              key={body.id}
              onClick={() => handleOpenBody(body)}
              className={`relative overflow-hidden rounded-xl cursor-pointer group bg-gradient-to-br ${body.color} p-3 sm:p-5 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between min-h-[110px] sm:min-h-[140px]`}
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                    <body.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] sm:text-xs font-semibold">
                      {getProjectCount(body.id)} Projects
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 sm:mt-5">
                  <h2 className="text-sm sm:text-lg lg:text-xl font-bold leading-tight line-clamp-2">{body.name}</h2>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal / Detail Window */}
      {activeBody && (
        <ProjectModal 
          body={activeBody} 
          onClose={handleCloseBody}
          projects={allProjects.filter(p => p.localBodyId === activeBody.id)}
          onAddProject={(name) => handleAddProject(activeBody.id, name)}
          user={user}
          authError={authError}
          localUpdates={localUpdates}
          setLocalUpdates={setLocalUpdates}
          setAllProjects={setAllProjects}
        />
      )}
    </div>
  );
}

function ProjectModal({ body, onClose, projects, onAddProject, user, authError, localUpdates, setLocalUpdates, setAllProjects }) {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [allUpdates, setAllUpdates] = useState([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);

  // Actions & Dialog State
  const [actionMenu, setActionMenu] = useState(null); 
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!user || authError) {
      setAllUpdates(localUpdates);
      return;
    }

    setIsLoadingUpdates(true);
    const updatesRef = collection(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates');
    
    const unsubscribe = onSnapshot(updatesRef, (snapshot) => {
      const updatesData = [];
      snapshot.forEach(doc => {
        updatesData.push({ id: doc.id, ...doc.data() });
      });
      setAllUpdates(updatesData);
      setIsLoadingUpdates(false);
    }, (error) => {
      console.error("Error fetching updates:", error);
      setIsLoadingUpdates(false);
    });

    return () => unsubscribe();
  }, [user, authError, localUpdates]);

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddProject(newProjectName);
    setNewProjectName('');
    setIsAddingProject(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-6 bg-gradient-to-r ${body.color} text-white flex justify-between items-center shrink-0`}>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <body.icon className="w-6 h-6 sm:w-7 sm:h-7 opacity-80" />
              {body.name}
            </h2>
            <p className="mt-1 text-white/80 font-medium text-xs sm:text-sm">Manage and track local development projects.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsAddingProject(!isAddingProject)}
              className="p-2 sm:p-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-full transition-transform hover:scale-105 shadow-md flex items-center justify-center"
              title="Add New Project"
            >
              <Plus className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isAddingProject ? 'rotate-45' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm flex items-center justify-center"
              title="Close"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {isAddingProject && (
            <div className="mb-5 sm:mb-6 animate-in slide-in-from-top-2">
              <form onSubmit={handleCreateProject} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-sm sm:text-base"
                />
                <button 
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base"
                >
                  Create
                </button>
              </form>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-base sm:text-lg">No projects added yet.</p>
                <p className="text-xs sm:text-sm mt-1">Click the <Plus className="w-3 h-3 inline" /> button top right to get started.</p>
              </div>
            ) : (
              projects.map((project, index) => (
                <ProjectAccordion 
                  key={project.id} 
                  project={project} 
                  theme={body.theme}
                  index={index}
                  user={user}
                  authError={authError}
                  allUpdates={allUpdates.filter(u => u.projectId === project.id)}
                  isLoadingUpdates={isLoadingUpdates}
                  setLocalUpdates={setLocalUpdates}
                  setAllProjects={setAllProjects}
                  setActionMenu={setActionMenu}
                  setConfirmDialog={setConfirmDialog}
                  setPromptDialog={setPromptDialog}
                />
              ))
            )}
          </div>
        </div>

        {/* --- ACTION MENUS & CUSTOM MODALS --- */}
        {actionMenu && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActionMenu(null)}>
            <div className="bg-white w-full sm:max-w-sm rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">{actionMenu.title}</h3>
                <button onClick={() => setActionMenu(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {actionMenu.options.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => { setActionMenu(null); opt.onClick(); }}
                    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-colors text-sm font-medium ${opt.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setConfirmDialog(null)}>
            <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-red-500 mb-4"><AlertTriangle className="w-10 h-10" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-600 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm transition-colors">Cancel</button>
                <button 
                  onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} 
                  className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white text-sm transition-colors shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Dialog */}
        {promptDialog && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setPromptDialog(null)}>
            <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 mb-4">{promptDialog.title}</h3>
              <textarea 
                autoFocus
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px] text-slate-700"
                defaultValue={promptDialog.defaultValue}
                id="promptInput"
              />
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => setPromptDialog(null)} className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-sm transition-colors">Cancel</button>
                <button 
                  onClick={() => { 
                    const val = document.getElementById('promptInput').value;
                    if(val.trim()) { promptDialog.onConfirm(val.trim()); setPromptDialog(null); }
                  }} 
                  className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-sm transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ProjectAccordion({ project, theme, index, user, authError, allUpdates, isLoadingUpdates, setLocalUpdates, setAllProjects, setActionMenu, setConfirmDialog, setPromptDialog }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const isSavingRef = useRef(false);

  const themeStyles = THEME_MAP[theme] || THEME_MAP.indigo;
  const cardColorClass = index % 2 === 0 ? themeStyles.light : themeStyles.dark;

  const toggleAccordion = () => setIsOpen(!isOpen);

  // Compress images efficiently before previewing
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      try {
        const compressedBase64 = await compressImage(file);
        setImagePreviews(prev => [...prev, compressedBase64]);
      } catch (err) {
        console.error("Failed to compress image", err);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleEditProject = () => {
    setPromptDialog({
      title: "Edit Project Name",
      defaultValue: project.name,
      onConfirm: async (newName) => {
        if (!user || authError) {
          setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: newName } : p));
          return;
        }
        try {
          await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), { name: newName });
        } catch (e) { console.error("Edit failed:", e); }
      }
    });
  };

  const handleDeleteProject = () => {
    setConfirmDialog({
      title: "Delete Project",
      message: "Are you sure you want to delete this project? This will permanently hide it.",
      onConfirm: async () => {
        if (!user || authError) {
          setAllProjects(prev => prev.filter(p => p.id !== project.id));
          return;
        }
        try {
          await deleteDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id));
        } catch (e) { console.error("Delete failed:", e); }
      }
    });
  };

  const handleEditUpdate = (update) => {
    setPromptDialog({
      title: "Edit Update Text",
      defaultValue: update.text || "",
      onConfirm: async (newText) => {
        if (!user || authError) {
          setLocalUpdates(prev => prev.map(u => u.id === update.id ? { ...u, text: newText } : u));
          return;
        }
        try {
          await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', update.id), { text: newText });
        } catch (e) { console.error("Edit update failed:", e); }
      }
    });
  };

  const handleDeleteUpdate = (update) => {
    setConfirmDialog({
      title: "Delete Update",
      message: "Are you sure you want to delete this timeline update? Images linked to this update will be deleted from cloud storage to save space.",
      onConfirm: async () => {
        if (!user || authError) {
          setLocalUpdates(prev => prev.filter(u => u.id !== update.id));
          setAllProjects(prev => prev.map(p => p.id === project.id ? { ...p, updateCount: Math.max(0, (p.updateCount || 0) - 1) } : p));
          return;
        }
        try {
          // Clean up Firebase Storage images
          if (update.images && update.images.length > 0) {
            for (const imgUrl of update.images) {
              await deleteImageFromStorage(imgUrl);
            }
          }
          await deleteDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', update.id));
          await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id), {
            updateCount: Math.max(0, (project.updateCount || 0) - 1)
          });
        } catch (e) { console.error("Delete update failed:", e); }
      }
    });
  };

  const handleDeleteImage = (update, imageIndex) => {
    setConfirmDialog({
      title: "Delete Image",
      message: "Are you sure you want to remove this image? It will be permanently deleted from cloud storage.",
      onConfirm: async () => {
        const imageToDelete = update.images[imageIndex];
        const newImages = update.images.filter((_, i) => i !== imageIndex);
        if (!user || authError) {
          setLocalUpdates(prev => prev.map(u => u.id === update.id ? { ...u, images: newImages } : u));
          return;
        }
        try {
          // Delete physical file from Cloud Storage
          await deleteImageFromStorage(imageToDelete);
          // Update Firestore
          await updateDoc(doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', update.id), { images: newImages });
        } catch (e) { console.error("Delete image failed:", e); }
      }
    });
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if ((!updateText.trim() && imagePreviews.length === 0) || isSavingRef.current) return;
    
    isSavingRef.current = true;
    setIsUploading(true);
    
    const updateId = `upd_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;

    try {
      let uploadedUrls = [];

      // 1. Upload images to Firebase Storage first (if online), else fallback to base64
      if (user && !authError && storage) {
        for (let i = 0; i < imagePreviews.length; i++) {
          const url = await uploadImageToStorage(imagePreviews[i], updateId, i);
          uploadedUrls.push(url);
        }
      } else {
        uploadedUrls = [...imagePreviews];
      }

      const newUpdate = {
        id: updateId,
        projectId: project.id,
        text: updateText,
        images: uploadedUrls, // Publicly consumable storage URLs
        timestamp: new Date().toISOString()
      };

      // --- FALLBACK IN-MEMORY MODE SAVE ---
      if (!user || authError) {
        setLocalUpdates(prev => [newUpdate, ...prev]);
        setAllProjects(prev => prev.map(p => {
          if (p.id === project.id) {
            return { ...p, updateCount: (p.updateCount || 0) + 1 };
          }
          return p;
        }));

        // Clear Form
        setUpdateText('');
        setImagePreviews([]);
        return;
      }

      // --- FIREBASE CLOUD SAVE ---
      const updateDocRef = doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'project_updates', updateId);
      const projectMetaRef = doc(db, 'artifacts', CANVAS_APP_ID, 'public', 'data', 'projects', project.id);

      // Store individual update document safely
      await setDoc(updateDocRef, newUpdate);

      // Increment updateCount on project metadata
      await updateDoc(projectMetaRef, { updateCount: (project.updateCount || 0) + 1 });

      // Clear Form
      setUpdateText('');
      setImagePreviews([]);
    } catch (err) {
      console.error("Error saving update to Firebase:", err);
    } finally {
      isSavingRef.current = false;
      setIsUploading(false);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Sort updates by newest first in memory
  const sortedUpdates = [...allUpdates].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${cardColorClass}`}>
      {/* Accordion Header */}
      <LongPressable 
        as="button"
        onLongPress={(e) => {
          setActionMenu({
            title: "Project Options",
            options: [
              { label: "Edit Project Name", icon: <Edit3 className="w-4 h-4"/>, onClick: handleEditProject },
              { label: "Delete Project", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: handleDeleteProject }
            ]
          });
        }}
        onClick={toggleAccordion}
        className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between bg-transparent hover:bg-black/5 transition-colors text-left select-none touch-manipulation cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/60 shadow-sm hidden sm:block">
            <FileText className={`w-5 h-5 ${themeStyles.text}`} />
          </div>
          <div>
            <h3 className={`text-sm sm:text-base font-bold ${themeStyles.text}`}>{project.name}</h3>
            <p className="text-[10px] sm:text-xs opacity-70 font-medium mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(project.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-[10px] sm:text-xs font-semibold bg-white/70 px-2 py-1 rounded-full shadow-sm">
            {project.updateCount || 0} Updates
          </span>
          <div className={`p-1 rounded-full bg-white/70 shadow-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </LongPressable>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-black/5 bg-white/60 backdrop-blur-sm p-3 sm:p-5 animate-in slide-in-from-top-2 duration-200">
          
          {/* Add Update Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm mb-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Add Update</h4>
            <form onSubmit={handleSaveUpdate}>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y transition-colors text-sm text-slate-700"
                placeholder="What's the latest update?"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                disabled={isUploading}
              />
              
              {imagePreviews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="relative inline-block rounded-md overflow-hidden border border-slate-200 shadow-sm group">
                      <img src={preview} alt={`Preview ${i}`} className="h-10 w-10 sm:h-12 sm:w-12 object-cover bg-slate-100" />
                      <button 
                        type="button" 
                        onClick={() => removeImage(i)}
                        disabled={isUploading}
                        className="absolute top-0.5 right-0.5 bg-slate-900/60 text-white p-0.5 rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div>
                  <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageChange} disabled={isUploading} />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-md transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Attach Images
                  </button>
                </div>
                
                <button 
                  type="submit"
                  disabled={(!updateText.trim() && imagePreviews.length === 0) || isUploading}
                  className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-semibold transition-all shadow-sm active:scale-95 text-xs sm:text-sm"
                >
                  {isUploading ? (
                    <>Uploading... <Loader2 className="w-3.5 h-3.5 animate-spin" /></>
                  ) : (
                    <>Save <Send className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> History
            </h4>
            
            {isLoadingUpdates ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Loading timeline...</span>
              </div>
            ) : sortedUpdates.length === 0 ? (
              <p className="text-slate-500 italic text-xs text-center py-3">No updates yet.</p>
            ) : (
              <div className="relative border-l-2 border-slate-300 ml-2 md:ml-3 space-y-4 sm:space-y-6 pb-2">
                {sortedUpdates.map((update) => (
                  <div key={update.id} className="relative pl-5 sm:pl-8">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm z-10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    </div>
                    
                    {/* Update Content Card */}
                    <LongPressable
                      onLongPress={(e) => {
                        setActionMenu({
                          title: "Update Options",
                          options: [
                            { label: "Edit Text", icon: <Edit3 className="w-4 h-4"/>, onClick: () => handleEditUpdate(update) },
                            { label: "Delete Update", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => handleDeleteUpdate(update) }
                          ]
                        });
                      }}
                      className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 select-none touch-manipulation transition-colors hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium text-slate-400">
                          {formatDate(update.timestamp)} • {formatTime(update.timestamp)}
                        </span>
                      </div>
                      
                      {update.text && (
                        <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                          {update.text}
                        </div>
                      )}
                      
                      {update.images && update.images.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          {update.images.map((img, i) => (
                            <LongPressable 
                              as="button"
                              key={i}
                              onLongPress={(e) => {
                                setActionMenu({
                                  title: "Image Options",
                                  options: [
                                    { label: "Delete Image", icon: <Trash2 className="w-4 h-4"/>, danger: true, onClick: () => handleDeleteImage(update, i) }
                                  ]
                                });
                              }}
                              onClick={() => setExpandedImage(img)}
                              className="relative group flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all h-10 w-10 sm:h-12 sm:w-12 select-none touch-manipulation"
                            >
                              <img src={img} alt={`Attachment ${i}`} className="w-full h-full object-cover pointer-events-none" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </LongPressable>
                          ))}
                        </div>
                      )}
                    </LongPressable>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => setExpandedImage(null)}>
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setExpandedImage(null)}
              className="absolute -top-12 right-0 sm:-right-12 sm:top-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={expandedImage} alt="Expanded Attachment" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

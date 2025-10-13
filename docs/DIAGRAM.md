graph TB
    subgraph "Client Browser"
        subgraph "React Application"
            subgraph "Pages Layer"
                Login[Login Page]
                Signup[Signup Page]
                CanvasPage[Canvas Page]
            end
            
            subgraph "Components Layer"
                AuthLayout[Auth Layout]
                LoginForm[Login Form]
                SignupForm[Signup Form]
                Canvas[Canvas Container]
                CanvasStage[Canvas Stage<br/>Konva.js]
                Toolbar[Toolbar]
                Rectangle[Rectangle Shape]
                Circle[Circle Shape]
                Text[Text Shape]
                CursorOverlay[Cursor Overlay]
                UserList[User List]
                Header[Header]
                Sidebar[Sidebar]
            end
            
            subgraph "Hooks Layer"
                useAuth[useAuth<br/>Auth State]
                useCanvas[useCanvas<br/>Canvas State]
                useRealtimeObjects[useRealtimeObjects<br/>Object Sync + Locking]
                useBroadcastCursors[useBroadcastCursors<br/>Cursor Sync<br/>Random Colors]
                usePresence[usePresence<br/>Presence + Idle Detection]
            end
            
            subgraph "Utils & Lib Layer"
                Supabase[Supabase Client]
                Constants[Constants]
                CanvasHelpers[Canvas Helpers]
                Throttle[Throttle Utility]
            end
        end
        
        subgraph "Local State"
            LocalCanvas[Canvas State<br/>zoom, pan, position<br/>boundary: 0,0-5000,5000]
            LocalShapes[Shapes Array<br/>optimistic updates<br/>lock tracking]
            LocalCursors[Cursors Map<br/>userId → position + color]
        end
    end
    
    subgraph "Supabase Backend"
        subgraph "Authentication"
            SupaAuth[Supabase Auth<br/>JWT Tokens]
            AuthUsers[auth.users table]
        end
        
        subgraph "PostgreSQL Database"
            ProfilesTable[(profiles table<br/>id, display_name<br/>auto-generated from email)]
            ObjectsTable[(canvas_objects table<br/>id, type, x, y, fill<br/>locked_by, lock_acquired_at)]
        end
        
        subgraph "Real-time Engine"
            RealtimeChannel[Realtime Channel<br/>Postgres Changes]
            BroadcastChannel[Broadcast Channel<br/>Ephemeral Pub/Sub]
        end
        
        subgraph "Database Triggers"
            ProfileTrigger[Auto-create Profile<br/>on user signup<br/>extract display_name from email]
            UpdatedAtTrigger[Auto-update<br/>updated_at timestamp]
        end
    end
    
    subgraph "Deployment"
        Vercel[Vercel<br/>Static Hosting]
        VercelEdge[Edge Network<br/>CDN]
    end
    
    %% Page to Component connections
    Login --> AuthLayout
    Login --> LoginForm
    Signup --> AuthLayout
    Signup --> SignupForm
    CanvasPage --> Canvas
    
    %% Canvas Component connections
    Canvas --> Header
    Canvas --> Toolbar
    Canvas --> CanvasStage
    Canvas --> Sidebar
    Canvas --> CursorOverlay
    
    Sidebar --> UserList
    
    CanvasStage --> Rectangle
    CanvasStage --> Circle
    CanvasStage --> Text
    
    %% Component to Hook connections
    LoginForm -.uses.-> useAuth
    SignupForm -.uses.-> useAuth
    Canvas -.uses.-> useCanvas
    Canvas -.uses.-> useRealtimeObjects
    Canvas -.uses.-> useBroadcastCursors
    Canvas -.uses.-> usePresence
    
    %% Hook to Utility connections
    useAuth -.uses.-> Supabase
    useCanvas -.uses.-> CanvasHelpers
    useCanvas -.uses.-> Constants
    useRealtimeObjects -.uses.-> Supabase
    useBroadcastCursors -.uses.-> Supabase
    useBroadcastCursors -.uses.-> Throttle
    usePresence -.uses.-> Supabase
    
    %% Local State connections
    useCanvas -.manages.-> LocalCanvas
    useRealtimeObjects -.manages.-> LocalShapes
    useBroadcastCursors -.manages.-> LocalCursors
    
    %% Auth Flow
    useAuth -->|Sign Up/In| SupaAuth
    SupaAuth -->|JWT Token| useAuth
    SupaAuth -->|Create User| AuthUsers
    AuthUsers -->|Trigger| ProfileTrigger
    ProfileTrigger -->|Insert| ProfilesTable
    
    %% Realtime Object Sync Flow
    useRealtimeObjects -->|INSERT/UPDATE<br/>Acquire/Release Lock| ObjectsTable
    ObjectsTable -->|Trigger| UpdatedAtTrigger
    ObjectsTable -->|Postgres Changes<br/>Lock State| RealtimeChannel
    RealtimeChannel -->|Subscribe| useRealtimeObjects
    useRealtimeObjects -->|Update| LocalShapes
    
    %% Broadcast Cursor Flow
    useBroadcastCursors -->|Send Cursor Position<br/>30fps throttled| BroadcastChannel
    BroadcastChannel -->|Broadcast to Others| useBroadcastCursors
    useBroadcastCursors -->|Update| LocalCursors
    CursorOverlay -.reads.-> LocalCursors
    
    %% Presence Flow
    usePresence -->|Track Join/Leave<br/>Activity Timestamps| BroadcastChannel
    BroadcastChannel -->|Presence Events<br/>Idle State| usePresence
    UserList -.reads.-> usePresence
    
    %% Deployment Flow
    CanvasPage -->|Build & Deploy| Vercel
    Vercel -->|Serve via| VercelEdge
    VercelEdge -->|HTTPS| Login
    VercelEdge -->|HTTPS| Signup
    VercelEdge -->|HTTPS| CanvasPage
    
    %% Network connections
    Supabase -.WebSocket.-> RealtimeChannel
    Supabase -.WebSocket.-> BroadcastChannel
    Supabase -.REST API.-> ObjectsTable
    Supabase -.REST API.-> ProfilesTable
    Supabase -.REST API.-> SupaAuth
    
    %% Styling
    classDef clientLayer fill:#3B82F6,stroke:#1E40AF,color:#fff
    classDef supabaseLayer fill:#3ECF8E,stroke:#059669,color:#fff
    classDef deployLayer fill:#000,stroke:#333,color:#fff
    classDef dataLayer fill:#EF4444,stroke:#B91C1C,color:#fff
    classDef stateLayer fill:#F59E0B,stroke:#D97706,color:#fff
    
    class Login,Signup,CanvasPage,AuthLayout,LoginForm,SignupForm,Canvas,CanvasStage,Toolbar,Rectangle,Circle,Text,CursorOverlay,UserList,Header,Sidebar,useAuth,useCanvas,useRealtimeObjects,useBroadcastCursors,usePresence,Supabase,Constants,CanvasHelpers,Throttle clientLayer
    
    class SupaAuth,AuthUsers,RealtimeChannel,BroadcastChannel,ProfileTrigger,UpdatedAtTrigger supabaseLayer
    
    class ProfilesTable,ObjectsTable dataLayer
    
    class LocalCanvas,LocalShapes,LocalCursors stateLayer
    
    class Vercel,VercelEdge deployLayer
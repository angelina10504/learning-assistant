import { useState } from "react";

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  cardHover: "#334155",
  primary: "#6366f1",
  primaryLight: "#818cf8",
  accent: "#22d3ee",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  border: "#334155",
  inputBg: "#0f172a",
};

// Reusable Components
const Badge = ({ children, color = COLORS.primary, style }) => (
  <span style={{ background: color + "22", color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, ...style }}>{children}</span>
);

const ProgressBar = ({ value, max = 100, color = COLORS.primary, height = 8 }) => (
  <div style={{ background: COLORS.bg, borderRadius: height / 2, height, width: "100%", overflow: "hidden" }}>
    <div style={{ background: color, height: "100%", width: `${(value / max) * 100}%`, borderRadius: height / 2, transition: "width 0.5s ease" }} />
  </div>
);

const TopicNode = ({ name, status, number }) => {
  const statusConfig = {
    completed: { color: COLORS.success, icon: "✓", glow: "0 0 12px " + COLORS.success + "44" },
    current: { color: COLORS.accent, icon: "▶", glow: "0 0 16px " + COLORS.accent + "44" },
    locked: { color: COLORS.textMuted, icon: "🔒", glow: "none" },
    skipped: { color: COLORS.warning, icon: "⏭", glow: "none" },
  };
  const c = statusConfig[status] || statusConfig.locked;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: status === "current" ? c.color : c.color + "22", border: `2px solid ${c.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: status === "current" ? COLORS.bg : c.color, fontWeight: 700, boxShadow: c.glow, flexShrink: 0 }}>
        {status === "completed" ? c.icon : status === "current" ? c.icon : status === "skipped" ? c.icon : number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: status === "locked" ? COLORS.textMuted : COLORS.text, fontSize: 14, fontWeight: status === "current" ? 600 : 400 }}>{name}</div>
        {status === "current" && <div style={{ color: COLORS.accent, fontSize: 11, marginTop: 2 }}>In progress...</div>}
      </div>
      {status === "completed" && <Badge color={COLORS.success}>Done</Badge>}
      {status === "skipped" && <Badge color={COLORS.warning}>Skipped</Badge>}
    </div>
  );
};

// ===================== SCREENS =====================

const LoginScreen = ({ onLogin }) => {
  const [role, setRole] = useState("student");
  const [isRegister, setIsRegister] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.bg} 0%, #1a1a2e 50%, ${COLORS.bg} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: COLORS.card, borderRadius: 20, padding: 40, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
          <h1 style={{ color: COLORS.text, fontSize: 26, fontWeight: 700, margin: 0 }}>StudyAgent</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "8px 0 0" }}>AI-Powered Personalized Study Planner</p>
        </div>

        <div style={{ display: "flex", background: COLORS.bg, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {["student", "teacher"].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: role === r ? COLORS.primary : "transparent", color: role === r ? "#fff" : COLORS.textMuted, fontWeight: 600, cursor: "pointer", fontSize: 14, textTransform: "capitalize", transition: "all 0.2s" }}>{r === "student" ? "🎓 Student" : "👨‍🏫 Teacher"}</button>
          ))}
        </div>

        {isRegister && <input placeholder="Full Name" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />}
        <input placeholder="Email" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
        <input placeholder="Password" type="password" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontSize: 14, marginBottom: 20, outline: "none", boxSizing: "border-box" }} />

        <button onClick={() => onLogin(role)} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: `0 4px 20px ${COLORS.primary}44` }}>
          {isRegister ? "Create Account" : "Sign In"} →
        </button>
        <p style={{ textAlign: "center", marginTop: 16, color: COLORS.textMuted, fontSize: 13 }}>
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <span onClick={() => setIsRegister(!isRegister)} style={{ color: COLORS.primaryLight, cursor: "pointer", fontWeight: 600 }}>{isRegister ? "Sign In" : "Register"}</span>
        </p>
      </div>
    </div>
  );
};

const TeacherDashboard = ({ onNavigate }) => {
  const classes = [
    { name: "Data Structures & Algorithms", students: 45, materials: 3, code: "DSA247", completion: 62 },
    { name: "Operating Systems", students: 38, materials: 2, code: "OS1234", completion: 41 },
    { name: "Database Management", students: 52, materials: 4, code: "DBM567", completion: 78 },
  ];
  const topStudents = [
    { name: "Riya Sharma", progress: 92, topics: "14/15", time: "28h" },
    { name: "Arjun Patel", progress: 85, topics: "12/15", time: "24h" },
    { name: "Priya Singh", progress: 78, topics: "11/15", time: "20h" },
  ];
  const weakAreas = [
    { topic: "AVL Tree Rotations", students: 18, avg: 35 },
    { topic: "Dynamic Programming", students: 24, avg: 42 },
    { topic: "Graph Traversal (BFS/DFS)", students: 12, avg: 55 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      {/* Navbar */}
      <nav style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 18 }}>StudyAgent</span>
          <Badge color={COLORS.accent}>Teacher</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 14 }}>Prof. Gupta</span>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>AG</div>
        </div>
      </nav>

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: COLORS.text, fontSize: 28, fontWeight: 700, margin: 0 }}>Dashboard</h1>
            <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "4px 0 0" }}>Manage your classes and track student progress</p>
          </div>
          <button style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: COLORS.primary, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>+ Create Class</button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Students", value: "135", icon: "👥", color: COLORS.primary },
            { label: "Active Classes", value: "3", icon: "📚", color: COLORS.accent },
            { label: "Avg Completion", value: "60%", icon: "📊", color: COLORS.success },
            { label: "Weak Topics Flagged", value: "8", icon: "⚠️", color: COLORS.warning },
          ].map((s, i) => (
            <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: "20px", border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>{s.label}</p>
                  <p style={{ color: COLORS.text, fontSize: 28, fontWeight: 700, margin: "4px 0 0" }}>{s.value}</p>
                </div>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Classes */}
          <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ color: COLORS.text, fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>Your Classes</h3>
            {classes.map((c, i) => (
              <div key={i} onClick={() => onNavigate("class-detail")} style={{ padding: "14px", borderRadius: 10, background: COLORS.bg, marginBottom: 10, cursor: "pointer", border: `1px solid transparent`, transition: "border 0.2s" }} onMouseOver={e => e.currentTarget.style.border = `1px solid ${COLORS.primary}44`} onMouseOut={e => e.currentTarget.style.border = `1px solid transparent`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                  <Badge color={COLORS.textMuted} style={{ fontFamily: "monospace" }}>{c.code}</Badge>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>👥 {c.students} students</span>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>📄 {c.materials} materials</span>
                </div>
                <ProgressBar value={c.completion} color={c.completion > 70 ? COLORS.success : c.completion > 50 ? COLORS.warning : COLORS.danger} />
                <span style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4, display: "block" }}>{c.completion}% avg completion</span>
              </div>
            ))}
          </div>

          {/* Weak Areas Alert */}
          <div>
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
              <h3 style={{ color: COLORS.text, fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>⚠️ Class-Wide Weak Areas</h3>
              {weakAreas.map((w, i) => (
                <div key={i} style={{ padding: "12px", borderRadius: 10, background: COLORS.bg, marginBottom: 8, borderLeft: `3px solid ${COLORS.danger}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>{w.topic}</span>
                    <Badge color={COLORS.danger}>{w.students} struggling</Badge>
                  </div>
                  <ProgressBar value={w.avg} color={COLORS.danger} height={6} />
                  <span style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 3, display: "block" }}>Avg confidence: {w.avg}%</span>
                </div>
              ))}
            </div>

            {/* Top Performers */}
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
              <h3 style={{ color: COLORS.text, fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>🏆 Top Performers (DSA)</h3>
              {topStudents.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? `1px solid ${COLORS.border}` : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: [COLORS.warning, COLORS.textMuted, "#cd7f32"][i] + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{["🥇", "🥈", "🥉"][i]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{s.topics} topics · {s.time} studied</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: COLORS.success, fontWeight: 700, fontSize: 16 }}>{s.progress}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div style={{ marginTop: 20, background: COLORS.card, borderRadius: 14, padding: "16px 20px", border: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>📊 Export Analytics for Power BI</span>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "4px 0 0" }}>Download CSV with student progress, weak areas, and session data</p>
          </div>
          <button style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Export CSV ↓</button>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ onNavigate }) => {
  const plan = [
    { name: "Arrays & Searching", status: "completed" },
    { name: "Linked Lists", status: "completed" },
    { name: "Stacks & Queues", status: "completed" },
    { name: "Trees (BST, AVL)", status: "current" },
    { name: "Heaps & Priority Queues", status: "locked" },
    { name: "Graphs (BFS, DFS)", status: "locked" },
    { name: "Dynamic Programming", status: "locked" },
  ];
  const weakTopics = ["AVL Tree Rotations", "Stack using Queues"];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <nav style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 18 }}>StudyAgent</span>
          <Badge color={COLORS.success}>Student</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 14 }}>Angelina</span>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>A</div>
        </div>
      </nav>

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: COLORS.text, fontSize: 28, fontWeight: 700, margin: 0 }}>Welcome back, Angelina</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: "4px 0 0" }}>Continue your personalized study journey</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Topics Completed", value: "3/7", icon: "✅", color: COLORS.success },
            { label: "Study Hours", value: "12.5h", icon: "⏱️", color: COLORS.accent },
            { label: "Current Streak", value: "5 days", icon: "🔥", color: COLORS.warning },
            { label: "Avg Confidence", value: "74%", icon: "📈", color: COLORS.primary },
          ].map((s, i) => (
            <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: "20px", border: `1px solid ${COLORS.border}` }}>
              <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>{s.label}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: COLORS.text, fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{s.value}</p>
                <span style={{ fontSize: 26 }}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Learning Banner */}
        <div onClick={() => onNavigate("study-session")} style={{ background: `linear-gradient(135deg, ${COLORS.primary}33, ${COLORS.accent}22)`, borderRadius: 16, padding: "24px 28px", marginBottom: 24, cursor: "pointer", border: `1px solid ${COLORS.primary}44`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Badge color={COLORS.accent} style={{ marginBottom: 8 }}>Continue Learning</Badge>
            <h2 style={{ color: COLORS.text, fontSize: 22, fontWeight: 700, margin: "8px 0 4px" }}>Trees (BST, AVL)</h2>
            <p style={{ color: COLORS.textMuted, fontSize: 13, margin: 0 }}>You were working on AVL Tree rotations. The agent noticed you need more practice with left-right rotations.</p>
          </div>
          <div style={{ background: COLORS.primary, borderRadius: 14, padding: "14px 28px", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>Resume →</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Enrolled Classes */}
          <div>
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: COLORS.text, fontSize: 16, margin: 0, fontWeight: 600 }}>My Classes</h3>
                <button style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, fontSize: 12, cursor: "pointer" }}>+ Join Class</button>
              </div>
              {[
                { name: "Data Structures & Algorithms", teacher: "Prof. Gupta", progress: 43, mode: "Compulsory", deadline: "April 15" },
                { name: "Operating Systems", teacher: "Prof. Mehta", progress: 28, mode: "Self-learning", deadline: null },
              ].map((c, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 12, background: COLORS.bg, marginBottom: 10, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{c.teacher}</div>
                    </div>
                    <Badge color={c.mode === "Compulsory" ? COLORS.danger : COLORS.success}>{c.mode}</Badge>
                  </div>
                  {c.deadline && <div style={{ color: COLORS.warning, fontSize: 11, marginBottom: 8 }}>⏰ Deadline: {c.deadline}</div>}
                  <ProgressBar value={c.progress} color={COLORS.primary} />
                  <span style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4, display: "block" }}>{c.progress}% complete</span>
                </div>
              ))}
            </div>

            {/* Weak Areas */}
            <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
              <h3 style={{ color: COLORS.text, fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>⚠️ Areas to Revisit</h3>
              {weakTopics.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: COLORS.bg, marginBottom: 8, borderLeft: `3px solid ${COLORS.warning}` }}>
                  <span style={{ color: COLORS.text, fontSize: 13, flex: 1 }}>{t}</span>
                  <button onClick={() => onNavigate("study-session")} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: COLORS.primary + "33", color: COLORS.primaryLight, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Practice →</button>
                </div>
              ))}
            </div>
          </div>

          {/* Study Plan Roadmap */}
          <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ color: COLORS.text, fontSize: 16, margin: "0 0 4px", fontWeight: 600 }}>Your Study Plan</h3>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "0 0 16px" }}>DSA · Personalized for you</p>
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 17, top: 8, bottom: 8, width: 2, background: COLORS.border }} />
              {plan.map((t, i) => (
                <TopicNode key={i} name={t.name} status={t.status} number={i + 1} />
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: COLORS.bg, textAlign: "center" }}>
              <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Estimated completion: </span>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>April 10, 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudySession = ({ onBack }) => {
  const [input, setInput] = useState("");
  const messages = [
    { role: "ai", content: "Welcome back! Last time we were working on Binary Search Trees. You did great with insertion and search operations. Today let's tackle **AVL Trees** — they build on BSTs but add self-balancing. Ready to begin?", tools: [], time: "10:30 AM" },
    { role: "human", content: "Yes! I remember BSTs but I'm confused about why we need AVL trees. What's wrong with regular BSTs?", time: "10:31 AM" },
    { role: "ai", content: "Great question! The problem with regular BSTs is that they can become **skewed**. Imagine inserting 1, 2, 3, 4, 5 in order — you'd get a straight line, essentially a linked list. Search becomes O(n) instead of O(log n).\n\nAVL trees solve this by ensuring the height difference between left and right subtrees (called the **balance factor**) never exceeds 1. When it does, the tree performs **rotations** to rebalance.\n\n📖 From your notes: *\"An AVL tree is a self-balancing BST where the balance factor of every node is -1, 0, or +1.\"*", tools: ["retrieve_from_notes"], sources: ["Ch. 5, Page 142"], time: "10:31 AM" },
    { role: "human", content: "Oh that makes sense! So rotations are what keep it balanced?", time: "10:32 AM" },
    { role: "ai", content: "Exactly! There are 4 types of rotations. Let me check your understanding with a quick question:\n\n**Question:** If you have a tree where the root has balance factor +2 and the root's left child has balance factor +1, which type of rotation would you perform?\n\na) Left rotation\nb) Right rotation\nc) Left-Right rotation\nd) Right-Left rotation\n\nTake your time!", tools: ["retrieve_from_notes", "ask_student_question"], time: "10:33 AM" },
    { role: "human", content: "I think it's a) left rotation? Because the left side is heavy so we rotate left?", time: "10:34 AM" },
    { role: "ai", content: "Not quite, but your thinking is on the right track! When the left side is heavy (balance factor +2), we actually do a **Right rotation** (option b) — we rotate the heavy side *up* and the root *down to the right*.\n\nThink of it like this: if the tree is leaning left, you push it right to straighten it. The rotation direction is where the root *goes*, not where the weight is.\n\nI've noted this as an area to practice more. Want me to walk through a visual example of right rotation step by step?", tools: ["log_weak_topic"], time: "10:34 AM" },
  ];

  const plan = [
    { name: "BST Basics", status: "completed" },
    { name: "BST Operations", status: "completed" },
    { name: "AVL Trees Intro", status: "current" },
    { name: "AVL Rotations", status: "locked" },
    { name: "AVL Insertion/Deletion", status: "locked" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column" }}>
      {/* Session Header */}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 18 }}>←</button>
          <div>
            <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15 }}>Trees (BST, AVL) — Study Session</div>
            <div style={{ color: COLORS.textMuted, fontSize: 11 }}>DSA · Prof. Gupta · Session #8</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge color={COLORS.success}>⏱ 14:23</Badge>
          <button style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.danger}44`, background: COLORS.danger + "11", color: COLORS.danger, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>End Session</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "human" ? "flex-end" : "flex-start", marginBottom: 16 }}>
                <div style={{ maxWidth: "75%", background: m.role === "human" ? COLORS.primary : COLORS.card, borderRadius: m.role === "human" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "14px 18px", border: m.role === "ai" ? `1px solid ${COLORS.border}` : "none" }}>
                  {m.role === "ai" && m.tools && m.tools.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      {m.tools.map((t, j) => (
                        <span key={j} style={{ background: COLORS.accent + "22", color: COLORS.accent, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>
                          {t === "retrieve_from_notes" ? "📖 Retrieved" : t === "ask_student_question" ? "❓ Question" : t === "log_weak_topic" ? "📝 Logged Weak Area" : t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.sources && (
                    <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: COLORS.bg, fontSize: 11, color: COLORS.textMuted }}>
                      📄 Source: {m.sources.join(", ")}
                    </div>
                  )}
                  <div style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 6, textAlign: m.role === "human" ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{ padding: "8px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Explain with an example", "Ask me another question", "Show me a diagram", "Move to next topic"].map((a, i) => (
              <button key={i} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, fontSize: 12, cursor: "pointer" }}>{a}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.card }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything about the topic..."
                style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontSize: 14, outline: "none" }}
              />
              <button style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: COLORS.primary, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
            </div>
          </div>
        </div>

        {/* Sidebar - Topic Progress */}
        <div style={{ width: 280, background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`, padding: 20, overflow: "auto" }}>
          <h4 style={{ color: COLORS.text, fontSize: 14, margin: "0 0 4px", fontWeight: 600 }}>Topic Roadmap</h4>
          <p style={{ color: COLORS.textMuted, fontSize: 11, margin: "0 0 16px" }}>Trees Chapter</p>

          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 17, top: 8, bottom: 8, width: 2, background: COLORS.border }} />
            {plan.map((t, i) => <TopicNode key={i} name={t.name} status={t.status} number={i + 1} />)}
          </div>

          <div style={{ marginTop: 20, padding: 12, borderRadius: 10, background: COLORS.bg }}>
            <h5 style={{ color: COLORS.text, fontSize: 12, margin: "0 0 8px", fontWeight: 600 }}>Session Stats</h5>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Questions asked</span>
              <span style={{ color: COLORS.text, fontSize: 11, fontWeight: 600 }}>1</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Correct answers</span>
              <span style={{ color: COLORS.danger, fontSize: 11, fontWeight: 600 }}>0/1</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Confidence</span>
              <span style={{ color: COLORS.warning, fontSize: 11, fontWeight: 600 }}>Building...</span>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: COLORS.warning + "11", borderLeft: `3px solid ${COLORS.warning}` }}>
            <h5 style={{ color: COLORS.warning, fontSize: 12, margin: "0 0 4px", fontWeight: 600 }}>Weak Spot Detected</h5>
            <p style={{ color: COLORS.textMuted, fontSize: 11, margin: 0 }}>AVL rotation direction logic — the agent will revisit this</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClassDetailTeacher = ({ onBack }) => {
  const students = [
    { name: "Riya Sharma", progress: 92, weak: "None", sessions: 12, lastActive: "2h ago", confidence: 88 },
    { name: "Arjun Patel", progress: 85, weak: "DP", sessions: 10, lastActive: "5h ago", confidence: 76 },
    { name: "Priya Singh", progress: 78, weak: "Graphs", sessions: 9, lastActive: "1d ago", confidence: 71 },
    { name: "Karan Mehta", progress: 45, weak: "Trees, Graphs", sessions: 5, lastActive: "3d ago", confidence: 52 },
    { name: "Anjali Reddy", progress: 38, weak: "Trees, DP", sessions: 4, lastActive: "5d ago", confidence: 44 },
  ];

  const milestones = [
    { topic: "Arrays & Searching", deadline: "Mar 20", status: "passed" },
    { topic: "Trees (BST, AVL)", deadline: "Apr 5", status: "upcoming" },
    { topic: "All Topics", deadline: "Apr 15", status: "final" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <nav style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 18 }}>←</button>
        <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 18 }}>Data Structures & Algorithms</span>
        <Badge color={COLORS.textMuted} style={{ fontFamily: "monospace" }}>DSA247</Badge>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, fontSize: 12, cursor: "pointer" }}>📄 Upload Material</button>
          <button style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.accent}`, background: "transparent", color: COLORS.accent, fontSize: 12, cursor: "pointer" }}>📊 Export CSV</button>
        </div>
      </nav>

      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {/* Milestones */}
        <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: COLORS.text, fontSize: 16, margin: 0, fontWeight: 600 }}>📅 Milestones & Deadlines</h3>
            <button style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primaryLight, fontSize: 12, cursor: "pointer" }}>+ Add Milestone</button>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ flex: 1, padding: 14, borderRadius: 10, background: COLORS.bg, border: `1px solid ${m.status === "upcoming" ? COLORS.warning + "44" : m.status === "final" ? COLORS.danger + "44" : COLORS.success + "44"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>{m.topic}</span>
                  <Badge color={m.status === "passed" ? COLORS.success : m.status === "upcoming" ? COLORS.warning : COLORS.danger}>
                    {m.status === "passed" ? "Passed" : m.deadline}
                  </Badge>
                </div>
                <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{m.status === "final" ? "🔒 Compulsory — No skipping" : "Deadline: " + m.deadline}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Student Table */}
        <div style={{ background: COLORS.card, borderRadius: 14, padding: 20, border: `1px solid ${COLORS.border}` }}>
          <h3 style={{ color: COLORS.text, fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>👥 Students ({students.length})</h3>

          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr", padding: "10px 14px", borderRadius: 8, background: COLORS.bg, marginBottom: 8 }}>
            {["Student", "Progress", "Weak Areas", "Sessions", "Confidence", "Last Active"].map((h, i) => (
              <span key={i} style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
            ))}
          </div>

          {students.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr", padding: "12px 14px", borderRadius: 8, marginBottom: 4, alignItems: "center", cursor: "pointer" }} onMouseOver={e => e.currentTarget.style.background = COLORS.bg} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.primary + "33", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.primaryLight, fontWeight: 700, fontSize: 12 }}>{s.name.split(" ").map(n => n[0]).join("")}</div>
                <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              </div>
              <div>
                <ProgressBar value={s.progress} color={s.progress > 70 ? COLORS.success : s.progress > 50 ? COLORS.warning : COLORS.danger} height={6} />
                <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{s.progress}%</span>
              </div>
              <span style={{ color: s.weak === "None" ? COLORS.success : COLORS.warning, fontSize: 12 }}>{s.weak}</span>
              <span style={{ color: COLORS.text, fontSize: 13 }}>{s.sessions}</span>
              <Badge color={s.confidence > 70 ? COLORS.success : s.confidence > 50 ? COLORS.warning : COLORS.danger}>{s.confidence}%</Badge>
              <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{s.lastActive}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN APP =====================

export default function App() {
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState(null);

  const handleLogin = (r) => {
    setRole(r);
    setScreen(r === "teacher" ? "teacher-dashboard" : "student-dashboard");
  };

  const navigate = (s) => setScreen(s);

  switch (screen) {
    case "login":
      return <LoginScreen onLogin={handleLogin} />;
    case "teacher-dashboard":
      return <TeacherDashboard onNavigate={navigate} />;
    case "student-dashboard":
      return <StudentDashboard onNavigate={navigate} />;
    case "study-session":
      return <StudySession onBack={() => setScreen("student-dashboard")} />;
    case "class-detail":
      return <ClassDetailTeacher onBack={() => setScreen("teacher-dashboard")} />;
    default:
      return <LoginScreen onLogin={handleLogin} />;
  }
}

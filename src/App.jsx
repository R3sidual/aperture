import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Mock essay data (replace with DB queries once essays exist) ──
const MOCK_ESSAYS = [
  { id: "1", title: "Shadows of the Altiplano", genre: "Documentary", photographer: "Amara Diallo", photo_count: 34, year: 2026, img: "https://images.unsplash.com/photo-1447752875215-b2761acf3d9a?w=900&q=75" },
  { id: "2", title: "Fjordland Silence",         genre: "Landscape",    photographer: "Erik Vatn",    photo_count: 21, year: 2026, img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=75" },
  { id: "3", title: "Night Market, Chengdu",     genre: "Urban",        photographer: "Yuki Tanaka",  photo_count: 18, year: 2026, img: "https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=700&q=75" },
  { id: "4", title: "Women of the Namib",        genre: "Portrait",     photographer: "Sena Owusu",   photo_count: 27, year: 2025, img: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=700&q=75" },
  { id: "5", title: "Geometries of Loss",        genre: "Fine Art",     photographer: "Pilar Reyes",  photo_count: 15, year: 2025, img: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=700&q=75" },
  { id: "6", title: "A River Divides",           genre: "Documentary",  photographer: "Jonas Müller", photo_count: 29, year: 2026, img: "https://images.unsplash.com/photo-1551009175-8a68da93d5f9?w=700&q=75" },
  { id: "7", title: "Monsoon Season, Kolkata",   genre: "Street",       photographer: "Priya Nair",   photo_count: 22, year: 2025, img: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=700&q=75" },
  { id: "8", title: "High Atlas, Autumn",        genre: "Landscape",    photographer: "Hassan El Fassi", photo_count: 31, year: 2026, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=75" },
  { id: "9", title: "Estuary at Dusk",           genre: "Landscape",    photographer: "Cécile Morin", photo_count: 19, year: 2025, img: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=700&q=75" },
];

const STATIC_PAGES = ["about", "guidelines", "editorial", "faq", "contact", "essay"];

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]           = useState("main");   // main | profile | about | guidelines | editorial | faq | contact
  const [user, setUser]           = useState(null);     // Supabase user
  const [profile, setProfile]     = useState(null);     // users table row
  const [saved, setSaved]         = useState([]);       // saved_essays rows
  const [authModal, setAuthModal] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);
  const [authTab, setAuthTab]     = useState("signin");
  const [profileTab, setProfileTab] = useState("saved");
  const [submitStep, setSubmitStep] = useState(1);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitForm, setSubmitForm] = useState({ name:"", bio:"", influences:"", title:"", genre:"", statement:"", fileCount:0 });
  const [editForm, setEditForm]   = useState({ first:"", last:"", bio:"", website:"", instagram:"", lineage_node_id:"" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingEssay, setEditingEssay] = useState(null);
  const [essayEditForm, setEssayEditForm] = useState({ title:"", genre:"", statement:"", influences:"" });
  const [essayPhotos, setEssayPhotos] = useState([]);   // photos for the essay being edited
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [editingCaption, setEditingCaption] = useState(null); // photo id being captioned
  const [captionForm, setCaptionForm] = useState({ location:"", year:"", caption:"" });
  const [reviewingEssay, setReviewingEssay] = useState(null); // editor review
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [reviewNote, setReviewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editorSubmissions, setEditorSubmissions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [publishedEssays, setPublishedEssays] = useState([]);
  const [readingEssay, setReadingEssay] = useState(null);   // { essay, photos, photographer }
  const [loadingEssay, setLoadingEssay] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signInForm, setSignInForm] = useState({ email:"", password:"" });
  const [signUpForm, setSignUpForm] = useState({ first:"", last:"", email:"", password:"" });

  // ── Fetch published essays on mount ───────────────────────
  useEffect(() => {
    fetchPublishedEssays();
  }, []);

  const fetchPublishedEssays = async () => {
    const { data: essays } = await supabase
      .from("essays")
      .select("id, title, genre, statement, published_at, photographer_id")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (!essays || essays.length === 0) { setPublishedEssays([]); return; }

    // Fetch cover photos
    const { data: covers } = await supabase
      .from("photos")
      .select("essay_id, display_url")
      .in("essay_id", essays.map(e => e.id))
      .eq("is_cover", true);
    const coverMap = Object.fromEntries((covers||[]).map(c => [c.essay_id, c.display_url]));

    // Fetch photographers
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, bio")
      .in("id", essays.map(e => e.photographer_id));
    const profileMap = Object.fromEntries((profiles||[]).map(p => [p.id, p]));

    setPublishedEssays(essays.map(e => ({
      ...e,
      cover_url: coverMap[e.id] || null,
      photographer: profileMap[e.photographer_id] || null,
    })));
  };

  // ── Auth listener ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleUserSession(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) handleUserSession(session.user);
      else { setUser(null); setProfile(null); setSaved([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUserSession = async (u) => {
    setUser(u);
    const { data } = await supabase.from("users").select("*").eq("id", u.id).single();
    if (data) {
      setProfile(data);
      const nameParts = (data.name || "").split(" ");
      setEditForm({
        first: nameParts[0] || "",
        last:  nameParts.slice(1).join(" ") || "",
        bio:   data.bio || "",
        website: data.website || "",
        instagram: data.instagram || "",
        lineage_node_id: data.lineage_node_id || "",
      influences: data.influences || "",
      });
      fetchSaved(u.id);
      fetchSubmissions(u.id);
      if (data?.is_editor) fetchEditorSubmissions();
    }
  };

  const fetchSaved = async (userId) => {
    const { data } = await supabase
      .from("saved_essays")
      .select("essay_id")
      .eq("user_id", userId);
    if (data) setSaved(data.map(r => r.essay_id));
  };

  const fetchEditorSubmissions = async () => {
    // Fetch essays
    const { data: essays } = await supabase
      .from("essays")
      .select("id, title, genre, status, created_at, statement, influences, photographer_id")
      .in("status", ["submitted","in_review","published","declined"])
      .order("created_at", { ascending: false });
    if (!essays) return;

    // Fetch photographer profiles separately to avoid FK dependency
    const photographerIds = [...new Set(essays.map(e => e.photographer_id))];
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, bio, instagram, website, lineage_node_id, influences")
      .in("id", photographerIds);

    const profileMap = Object.fromEntries((profiles||[]).map(p => [p.id, p]));
    setEditorSubmissions(essays.map(e => ({ ...e, users: profileMap[e.photographer_id] || null })));
  };

  const fetchSubmissions = async (userId) => {
    const { data } = await supabase
      .from("essays")
      .select("id, title, genre, status, created_at, influences, statement")
      .eq("photographer_id", userId)
      .order("created_at", { ascending: false });
    if (data) {
      // Fetch cover photos separately to avoid RLS join issues
      const enriched = await Promise.all(data.map(async (essay) => {
        const { data: cover } = await supabase
          .from("photos")
          .select("display_url")
          .eq("essay_id", essay.id)
          .eq("is_cover", true)
          .maybeSingle();
        return { ...essay, cover_url: cover?.display_url || null };
      }));
      setSubmissions(enriched);
    }
  };

  // ── Navigation ─────────────────────────────────────────────
  const showPage = useCallback((p) => {
    if (p === "profile" && !user) { setAuthModal(true); return; }
    setPage(p);
    window.scrollTo(0, 0);
  }, [user]);

  // ── Auth ───────────────────────────────────────────────────
  const doSignIn = async () => {
    setAuthError(""); setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInForm.email, password: signInForm.password
    });
    setSigningIn(false);
    if (error) setAuthError(error.message);
    else { setAuthModal(false); }
  };

  const doSignUp = async () => {
    setAuthError(""); setSigningIn(true);
    const name = [signUpForm.first, signUpForm.last].filter(Boolean).join(" ");
    const { error } = await supabase.auth.signUp({
      email: signUpForm.email,
      password: signUpForm.password,
      options: { data: { name } }
    });
    setSigningIn(false);
    if (error) setAuthError(error.message);
    else { setAuthModal(false); setTimeout(() => showPage("profile"), 300); }
  };

  const doSignOut = async () => {
    await supabase.auth.signOut();
    showPage("main");
  };

  // ── Save essay ──────────────────────────────────────────────
  const toggleSave = async (essayId) => {
    if (!user) { setAuthModal(true); return; }
    if (saved.includes(essayId)) {
      await supabase.from("saved_essays").delete().eq("user_id", user.id).eq("essay_id", essayId);
      setSaved(s => s.filter(id => id !== essayId));
    } else {
      await supabase.from("saved_essays").insert({ user_id: user.id, essay_id: essayId });
      setSaved(s => [...s, essayId]);
    }
  };

  // ── Save profile ────────────────────────────────────────────
  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setSaveError("");
    const name = [editForm.first, editForm.last].filter(Boolean).join(" ");
    const { data, error } = await supabase
      .from("users")
      .update({ name, bio: editForm.bio, website: editForm.website, instagram: editForm.instagram, lineage_node_id: editForm.lineage_node_id, influences: editForm.influences })
      .eq("id", user.id)
      .select()
      .single();
    if (error) setSaveError(error.message);
    if (data) { setProfile(data); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }
    setSavingProfile(false);
  };

  // ── Edit existing essay ────────────────────────────────────
  const openReview = async (essay) => {
    setReviewingEssay(essay);
    setReviewNote("");
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("essay_id", essay.id)
      .order("sequence_order");
    setReviewPhotos(data || []);
    window.scrollTo(0,0);
  };

  const saveNote = async () => {
    if (!reviewingEssay || !reviewNote.trim()) return;
    setSavingNote(true);
    await supabase.from("editorial_notes").insert({
      essay_id: reviewingEssay.id,
      editor_id: user.id,
      note: reviewNote.trim(),
    });
    setReviewNote("");
    setSavingNote(false);
  };

  const openEditEssay = async (essay) => {
    setEssayEditForm({ title: essay.title, genre: essay.genre || "", statement: essay.statement || "", influences: essay.influences || "" });
    setEditingEssay(essay);
    setPhotoError("");
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("essay_id", essay.id)
      .order("sequence_order");
    setEssayPhotos(data || []);
  };

  const uploadPhotos = async (files, essayId) => {
    if (!user) return;
    setUploadingPhotos(true);
    setPhotoError("");
    const existing = await supabase.from("photos").select("sequence_order").eq("essay_id", essayId).order("sequence_order", { ascending: false }).limit(1);
    let nextOrder = (existing.data?.[0]?.sequence_order || 0) + 1;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${essayId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("essay-photos").upload(path, file);
      if (upErr) { setPhotoError(upErr.message); continue; }
      const { data: urlData } = supabase.storage.from("essay-photos").getPublicUrl(path);
      await supabase.from("photos").insert({
        essay_id: essayId,
        storage_url: path,
        display_url: urlData.publicUrl,
        sequence_order: nextOrder++,
        is_cover: nextOrder === 2, // first uploaded becomes cover
      });
    }
    // Refresh photos
    const { data } = await supabase.from("photos").select("*").eq("essay_id", essayId).order("sequence_order");
    setEssayPhotos(data || []);
    setUploadingPhotos(false);
  };

  const deletePhoto = async (photo) => {
    await supabase.storage.from("essay-photos").remove([photo.storage_url]);
    await supabase.from("photos").delete().eq("id", photo.id);
    setEssayPhotos(p => p.filter(x => x.id !== photo.id));
  };

  const setCover = async (photo) => {
    await supabase.from("photos").update({ is_cover: false }).eq("essay_id", photo.essay_id);
    await supabase.from("photos").update({ is_cover: true }).eq("id", photo.id);
    setEssayPhotos(p => p.map(x => ({ ...x, is_cover: x.id === photo.id })));
    if (user) fetchSubmissions(user.id);
  };

  const movePhoto = async (photo, direction) => {
    const idx = essayPhotos.findIndex(p => p.id === photo.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= essayPhotos.length) return;
    const swap = essayPhotos[swapIdx];
    await supabase.from("photos").update({ sequence_order: swap.sequence_order }).eq("id", photo.id);
    await supabase.from("photos").update({ sequence_order: photo.sequence_order }).eq("id", swap.id);
    const { data } = await supabase.from("photos").select("*").eq("essay_id", photo.essay_id).order("sequence_order");
    setEssayPhotos(data || []);
  };

  const openCaption = (photo) => {
    setEditingCaption(photo.id);
    setCaptionForm({ location: photo.location || "", year: photo.year || "", caption: photo.caption || "" });
  };

  const saveCaption = async (photoId) => {
    await supabase.from("photos")
      .update({ location: captionForm.location, year: captionForm.year ? parseInt(captionForm.year) : null, caption: captionForm.caption })
      .eq("id", photoId);
    setEssayPhotos(p => p.map(x => x.id === photoId ? { ...x, ...captionForm, year: captionForm.year ? parseInt(captionForm.year) : null } : x));
    setEditingCaption(null);
  };

  const saveEssay = async () => {
    if (!editingEssay) return;
    const { data, error } = await supabase
      .from("essays")
      .update({ title: essayEditForm.title, genre: essayEditForm.genre, statement: essayEditForm.statement, influences: essayEditForm.influences })
      .eq("id", editingEssay.id)
      .select()
      .single();
    if (data) {
      setSubmissions(s => s.map(e => e.id === data.id ? data : e));
      setEditingEssay(null);
    }
  };

  // ── Open essay reader ──────────────────────────────────────
  const openEssay = async (essay) => {
    setLoadingEssay(true);
    showPage("essay");
    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .eq("essay_id", essay.id)
      .order("sequence_order");
    const { data: photographer } = await supabase
      .from("users")
      .select("id, name, bio, website, instagram, lineage_node_id")
      .eq("id", essay.photographer_id)
      .single();
    setReadingEssay({ essay, photos: photos || [], photographer });
    setLoadingEssay(false);
  };

  // ── Delete essay ────────────────────────────────────────────
  const deleteEssay = async (essayId) => {
    const { data: photos } = await supabase.from("photos").select("storage_url").eq("essay_id", essayId);
    if (photos?.length) {
      await supabase.storage.from("essay-photos").remove(photos.map(p => p.storage_url));
    }
    const { error } = await supabase.from("essays").delete().eq("id", essayId);
    if (error) { alert("Delete failed: " + error.message); return; }
    setSubmissions(s => s.filter(e => e.id !== essayId));
  };

  // ── Approve / change status (editor only) ───────────────────
  const updateEssayStatus = async (essayId, status) => {
    const { data, error } = await supabase
      .from("essays")
      .update({ status, ...(status === "published" ? { published_at: new Date().toISOString() } : {}) })
      .eq("id", essayId)
      .select()
      .single();
    if (error) { alert("Status update failed: " + error.message); return; }
    if (data) {
      setSubmissions(s => s.map(e => e.id === essayId ? { ...e, status: data.status } : e));
      setEditorSubmissions(s => s.map(e => e.id === essayId ? { ...e, status: data.status } : e));
      await fetchPublishedEssays();
    }
  };

  // ── Submit essay ────────────────────────────────────────────
  const openSubmit = () => {
    if (!user) { setAuthModal(true); return; }
    setSubmitStep(1); setSubmitDone(false);
    setSubmitForm({ name: profile?.name || "", bio: profile?.bio || "", title:"", genre:"", statement:"", fileCount:0 });
    setSubmitModal(true);
  };

  const doSubmit = async () => {
    setSubmitError("");
    const { error } = await supabase.from("essays").insert({
      photographer_id: user.id,
      title: submitForm.title,
      genre: submitForm.genre,
      statement: submitForm.statement,
      influences: submitForm.influences,
      status: "submitted",
    });
    if (error) { setSubmitError(error.message); return; }
    setSubmitDone(true);
    if (user) fetchSubmissions(user.id);
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <header>
        <div className="header-inner">
          <a className="logo" href="#" onClick={e => { e.preventDefault(); showPage("main"); }}>
            Aperture<span className="logo-dot" />
          </a>
          <div className="header-right">
            <span className="header-meta">Issue 01 · Open Submissions</span>
            <button className="btn-submit" onClick={openSubmit}>Submit Work</button>
            <button
              className={`btn-account${user ? " logged-in" : ""}`}
              onClick={() => user ? showPage("profile") : setAuthModal(true)}
              title={user ? "My Profile" : "Sign in"}
            >
              {user
                ? <span className="avatar-initial">{(profile?.name || user.email || "?")[0].toUpperCase()}</span>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              }
            </button>
          </div>
        </div>
      </header>

      {/* Pages */}
      {page === "main"      && <MainPage essays={publishedEssays} saved={saved} onSave={toggleSave} onSubmit={openSubmit} onNav={showPage} onEssay={openEssay} />}
      {page === "profile"   && <ProfilePage user={user} profile={profile} saved={saved} essays={MOCK_ESSAYS} submissions={submissions} editingEssay={editingEssay} essayEditForm={essayEditForm} setEssayEditForm={setEssayEditForm} openEditEssay={openEditEssay} saveEssay={saveEssay} setEditingEssay={setEditingEssay} deleteEssay={deleteEssay} updateEssayStatus={updateEssayStatus} essayPhotos={essayPhotos} uploadPhotos={uploadPhotos} deletePhoto={deletePhoto} setCover={setCover} movePhoto={movePhoto} uploadingPhotos={uploadingPhotos} photoError={photoError} editingCaption={editingCaption} captionForm={captionForm} setCaptionForm={setCaptionForm} openCaption={openCaption} saveCaption={saveCaption} reviewingEssay={reviewingEssay} reviewPhotos={reviewPhotos} openReview={openReview} setReviewingEssay={setReviewingEssay} reviewNote={reviewNote} setReviewNote={setReviewNote} saveNote={saveNote} savingNote={savingNote} editorSubmissions={editorSubmissions} updateEssayStatus={updateEssayStatus} fetchEditorSubmissions={fetchEditorSubmissions} profileTab={profileTab} setProfileTab={setProfileTab} editForm={editForm} setEditForm={setEditForm} saveProfile={saveProfile} savingProfile={savingProfile} saveError={saveError} saveSuccess={saveSuccess} doSignOut={doSignOut} openSubmit={openSubmit} onNav={showPage} />}
      {page === "about"     && <AboutPage onNav={showPage} />}
      {page === "guidelines"&& <GuidelinesPage onNav={showPage} openSubmit={openSubmit} />}
      {page === "editorial" && <EditorialPage onNav={showPage} />}
      {page === "faq"       && <FaqPage onNav={showPage} />}
      {page === "contact"   && <ContactPage onNav={showPage} />}
      {page === "essay"     && <EssayReaderPage essay={readingEssay} loading={loadingEssay} saved={saved} onSave={toggleSave} onNav={showPage} />}

      {/* Auth modal */}
      {authModal && (
        <Modal onClose={() => { setAuthModal(false); setAuthError(""); }}>
          <h2 className="modal-title">Welcome back.</h2>
          <div className="modal-tabs">
            <button className={`modal-tab${authTab==="signin"?" active":""}`} onClick={() => { setAuthTab("signin"); setAuthError(""); }}>Sign In</button>
            <button className={`modal-tab${authTab==="signup"?" active":""}`} onClick={() => { setAuthTab("signup"); setAuthError(""); }}>Create Account</button>
          </div>
          {authError && <p className="auth-error">{authError}</p>}
          {authTab === "signin" ? (
            <>
              <Field label="Email"><input type="email" value={signInForm.email} onChange={e => setSignInForm(f=>({...f,email:e.target.value}))} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&doSignIn()} /></Field>
              <Field label="Password"><input type="password" value={signInForm.password} onChange={e => setSignInForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&doSignIn()} /></Field>
              <button className="btn-primary" onClick={doSignIn} disabled={signingIn}>{signingIn ? "Signing in…" : "Sign In"}</button>
              <p className="modal-alt">No account? <button onClick={() => setAuthTab("signup")}>Create one</button></p>
            </>
          ) : (
            <>
              <div className="two-col">
                <Field label="First Name"><input type="text" value={signUpForm.first} onChange={e=>setSignUpForm(f=>({...f,first:e.target.value}))} placeholder="Maria" /></Field>
                <Field label="Last Name"><input type="text" value={signUpForm.last} onChange={e=>setSignUpForm(f=>({...f,last:e.target.value}))} placeholder="Solís" /></Field>
              </div>
              <Field label="Email"><input type="email" value={signUpForm.email} onChange={e=>setSignUpForm(f=>({...f,email:e.target.value}))} placeholder="you@example.com" /></Field>
              <Field label="Password"><input type="password" value={signUpForm.password} onChange={e=>setSignUpForm(f=>({...f,password:e.target.value}))} placeholder="Choose a password" /></Field>
              <button className="btn-primary" onClick={doSignUp} disabled={signingIn}>{signingIn ? "Creating…" : "Create Account"}</button>
              <p className="modal-alt">Already have one? <button onClick={() => setAuthTab("signin")}>Sign in</button></p>
            </>
          )}
        </Modal>
      )}

      {/* Submit modal */}
      {submitModal && (
        <Modal onClose={() => setSubmitModal(false)} wide>
          <h2 className="modal-title">Submit an Essay</h2>
          {!submitDone && (
            <div className="submit-steps">
              {[1,2,3,4].map(n => (
                <>
                  <div key={n} className={`step-dot${submitStep===n?" active":submitStep>n?" done":""}`}>{submitStep>n?"✓":n}</div>
                  {n < 4 && <div className="step-line" key={"l"+n}/>}
                </>
              ))}
            </div>
          )}
          {!submitDone ? <>
            {submitStep===1 && <>
              <h3 className="step-title">Your Profile</h3>
              <Field label="Full Name"><input value={submitForm.name} onChange={e=>setSubmitForm(f=>({...f,name:e.target.value}))} placeholder="Maria Solís" /></Field>
              <Field label="Short Bio"><textarea rows={3} value={submitForm.bio} onChange={e=>setSubmitForm(f=>({...f,bio:e.target.value}))} placeholder="Documentary photographer based in Lisbon…" /></Field>

              <button className="btn-primary" onClick={()=>setSubmitStep(2)}>Continue</button>
            </>}
            {submitStep===2 && <>
              <h3 className="step-title">Essay Details</h3>
              <Field label="Essay Title"><input value={submitForm.title} onChange={e=>setSubmitForm(f=>({...f,title:e.target.value}))} placeholder="The Light After Leaving" /></Field>
              <Field label="Genre">
                <select value={submitForm.genre} onChange={e=>setSubmitForm(f=>({...f,genre:e.target.value}))}>
                  <option value="">Select a genre…</option>
                  {["Documentary","Landscape","Portrait","Street","Fine Art","Urban","Travel"].map(g=><option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Artist Statement"><textarea rows={4} value={submitForm.statement} onChange={e=>setSubmitForm(f=>({...f,statement:e.target.value}))} placeholder="What is this essay about? What drew you to this subject?" /></Field>
              <div className="step-nav">
                <button className="btn-more" onClick={()=>setSubmitStep(1)}>← Back</button>
                <button className="btn-primary" onClick={()=>setSubmitStep(3)}>Continue</button>
              </div>
            </>}
            {submitStep===3 && <>
              <h3 className="step-title">Upload Photos</h3>
              <div className="upload-zone" onClick={()=>document.getElementById("file-input").click()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <p>Tap to select photos</p>
                <input id="file-input" type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>setSubmitForm(f=>({...f,fileCount:e.target.files.length}))} />
              </div>
              {submitForm.fileCount > 0 && <p className="file-count">{submitForm.fileCount} photo{submitForm.fileCount!==1?"s":""} selected</p>}
              <div className="step-nav">
                <button className="btn-more" onClick={()=>setSubmitStep(2)}>← Back</button>
                <button className="btn-primary" onClick={()=>setSubmitStep(4)}>Continue</button>
              </div>
            </>}
            {submitStep===4 && <>
              <h3 className="step-title">Review & Submit</h3>
              {[["Name",submitForm.name],["Title",submitForm.title],["Genre",submitForm.genre],["Photos",submitForm.fileCount+" selected"]].map(([k,v])=>(
                <div className="review-row" key={k}>
                  <span className="review-key">{k}</span>
                  <span className="review-val">{v||"—"}</span>
                </div>
              ))}
              <div className="step-nav">
                <button className="btn-more" onClick={()=>setSubmitStep(3)}>← Back</button>
                <button className="btn-primary" onClick={doSubmit}>Submit Essay</button>
              </div>
            </>}
          </> : (
            <div className="success-state">
              <div className="success-check">◦</div>
              <h3>Essay Submitted</h3>
              <p>We'll review your work and be in touch within 2–3 weeks.</p>
              <button className="btn-primary" style={{marginTop:24}} onClick={()=>setSubmitModal(false)}>Back to Aperture</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ─── Page components ──────────────────────────────────────────

function MainPage({ essays, saved, onSave, onSubmit, onNav, onEssay }) {
  return (
    <main className="main-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <p className="hero-kicker">Issue 01 — Now Open</p>
            <h1 className="hero-title">Long-form<br /><em>photography,</em><br />taken seriously.</h1>
            <p className="hero-desc">Aperture publishes photo essays — sequences of images made with intention. We're open for submissions and reading everything that comes in.</p>
            <div className="hero-actions">
              <button className="btn-read" onClick={onSubmit}><span className="btn-read-rule"/>{" "}Submit Your Work</button>
              <a href="#" className="btn-read" style={{opacity:.6}} onClick={e=>{e.preventDefault();onNav("guidelines");}}><span className="btn-read-rule"/>Read the Guidelines</a>
            </div>
          </div>

        </div>
        <div className="hero-stats">
          <div className="hero-stats-inner">
            <div className="stat-item"><span className="stat-num">0</span><span className="stat-label">Essays Published</span></div>
            <div className="stat-item"><span className="stat-num">2026</span><span className="stat-label">First Issue</span></div>
            <div className="stat-item"><span className="stat-num">Open</span><span className="stat-label">Submissions</span></div>
          </div>
        </div>
      </section>

      {/* Archive */}
      <section className="essays-section">
        <div className="section-head">
          <div><p className="section-label">All Essays</p><h2 className="section-title">The Archive</h2></div>
          <span className="section-count">{essays.length > 0 ? `${essays.length} essay${essays.length!==1?"s":""}` : "Issue 01"}</span>
        </div>
        <div className="essays-wrap">
          {essays.length === 0 ? (
            <div className="archive-empty">
              <p className="archive-empty-title">The first essays are on their way.</p>
              <p className="archive-empty-sub">Aperture is open for submissions. If you have a long-form photo essay to share, we'd like to read it.</p>
              <button className="btn-read" onClick={onSubmit} style={{marginTop:24}}>
                <span className="btn-read-rule"/>Submit Your Work
              </button>
            </div>
          ) : essays.length === 1 ? (
            <div className="single-essay-row">
              <EssayCard essay={essays[0]} large saved={saved.includes(essays[0].id)} onSave={onSave} onOpen={onEssay} />
            </div>
          ) : essays.length <= 3 ? (
            <div className="featured-row">
              <EssayCard essay={essays[0]} large saved={saved.includes(essays[0].id)} onSave={onSave} onOpen={onEssay} />
              <div className="stacked-col">
                {essays.slice(1,3).map(e => <EssayCard key={e.id} essay={e} saved={saved.includes(e.id)} onSave={onSave} onOpen={onEssay} />)}
              </div>
            </div>
          ) : (
            <>
              <div className="featured-row">
                <EssayCard essay={essays[0]} large saved={saved.includes(essays[0].id)} onSave={onSave} onOpen={onEssay} />
                <div className="stacked-col">
                  {essays.slice(1,3).map(e => <EssayCard key={e.id} essay={e} saved={saved.includes(e.id)} onSave={onSave} onOpen={onEssay} />)}
                </div>
              </div>
              <div className="standard-row">
                {essays.slice(3).map(e => <EssayCard key={e.id} essay={e} saved={saved.includes(e.id)} onSave={onSave} onOpen={onEssay} />)}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer onNav={onNav} />
    </main>
  );
}

function EssayCard({ essay, large, saved, onSave, onOpen }) {
  return (
    <div className={`card${large?" card--large":""}`} onClick={()=>onOpen&&onOpen(essay)} style={{cursor:onOpen?"pointer":"default"}}>
      <div className="card-img-wrap">
        {essay.cover_url
          ? <img className="card-img" src={essay.cover_url} alt="" loading="lazy" />
          : <div className="card-img card-img--empty" />}
      </div>
      <div className="card-body">
        <p className="card-genre">{essay.genre}</p>
        <h3 className="card-title">{essay.title}</h3>
        <div className="card-meta">
          <span className="card-author">{essay.photographer?.name || "—"}</span>
          {essay.published_at && <><span className="card-sep">·</span><span>{new Date(essay.published_at).getFullYear()}</span></>}
        </div>
        <div className="card-actions">
          <span className="card-link" onClick={e=>{e.stopPropagation();onOpen&&onOpen(essay);}}><span className="card-link-rule"/>Read Essay</span>
          <button className={`card-save${saved?" saved":""}`} onClick={e=>{e.stopPropagation();onSave(essay.id);}} title={saved?"Saved":"Save essay"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={saved?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, profile, saved, essays, submissions, editingEssay, essayEditForm, setEssayEditForm, openEditEssay, saveEssay, setEditingEssay, deleteEssay, updateEssayStatus, essayPhotos, editingCaption, captionForm, setCaptionForm, openCaption, saveCaption, reviewingEssay, reviewPhotos, openReview, setReviewingEssay, reviewNote, setReviewNote, saveNote, savingNote, editorSubmissions, fetchEditorSubmissions, uploadPhotos, deletePhoto, setCover, movePhoto, uploadingPhotos, photoError, profileTab, setProfileTab, editForm, setEditForm, saveProfile, savingProfile, saveError, saveSuccess, doSignOut, openSubmit, onNav }) {
  const savedEssays = essays.filter(e => saved.includes(e.id));
  const name = profile?.name || user?.email || "—";

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-inner">
          <div className="profile-avatar">{name[0].toUpperCase()}</div>
          <div>
            <h1 className="profile-name">{name}</h1>
            <p className="profile-bio">{profile?.bio || "No bio yet."}</p>
          </div>
          <div className="profile-hero-actions">
            {profile?.lineage_node_id ? (
              <a href={`https://lineage-two.vercel.app/?node=${profile.lineage_node_id}`} target="_blank" rel="noreferrer" className="btn-lineage">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>
                View on Lineage
              </a>
            ) : (
              <span className="lineage-hint">Add your Lineage Node ID in Edit Profile to link your node</span>
            )}
            <button className="btn-signout" onClick={doSignOut}>Sign out</button>
          </div>
        </div>
        <div className="profile-tabs">
          {["saved","submitted","edit"].map(t => (
            <button key={t} className={`profile-tab${profileTab===t?" active":""}`} onClick={()=>setProfileTab(t)}>
              {t === "saved" ? "Saved Essays" : t === "submitted" ? "Submitted" : "Edit Profile"}
            </button>
          ))}
          {profile?.is_editor && (
            <button className={`profile-tab${profileTab==="editorial"?" active":""}`} onClick={()=>setProfileTab("editorial")}>
              Editorial
              {editorSubmissions.filter(e=>e.status==="submitted").length > 0 && (
                <span className="tab-badge">{editorSubmissions.filter(e=>e.status==="submitted").length}</span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {profileTab === "saved" && (
          savedEssays.length === 0
            ? <div className="empty-state">No saved essays yet.<p>Bookmark essays to find them here.</p></div>
            : <div className="essay-list">
                {savedEssays.map(e => (
                  <div className="essay-row" key={e.id}>
                    <img className="essay-thumb" src={e.img} alt="" />
                    <div><div className="essay-row-title">{e.title}</div><div className="essay-row-meta">{e.genre} · {e.photographer}</div></div>
                    <span className="status-badge published">Saved</span>
                  </div>
                ))}
              </div>
        )}

        {profileTab === "submitted" && (
          <div>
            {submissions.length === 0
              ? <div className="empty-state">No submissions yet.<p>Ready to share your work?</p></div>
              : <div className="essay-list">
                  {submissions.map(e => (
                    editingEssay?.id === e.id ? (
                      <div className="essay-edit-panel" key={e.id}>
                        <div className="essay-edit-header">
                          <p className="essay-edit-label">Editing: {e.title}</p>
                          <button className="btn-edit-close" onClick={()=>{ setEditingEssay(null); if(user) fetchSubmissions(user.id); }}>← Done</button>
                        </div>

                        {/* Essay details */}
                        <div className="essay-edit-section">
                          <p className="essay-edit-section-title">Details</p>
                          <Field label="Title"><input value={essayEditForm.title} onChange={ev=>setEssayEditForm(f=>({...f,title:ev.target.value}))} /></Field>
                          <div className="two-col">
                            <Field label="Genre">
                              <select value={essayEditForm.genre} onChange={ev=>setEssayEditForm(f=>({...f,genre:ev.target.value}))}>
                                <option value="">Select…</option>
                                {["Documentary","Landscape","Portrait","Street","Fine Art","Urban","Travel"].map(g=><option key={g}>{g}</option>)}
                              </select>
                            </Field>
                            <Field label="Influences"><input value={essayEditForm.influences} onChange={ev=>setEssayEditForm(f=>({...f,influences:ev.target.value}))} /></Field>
                          </div>
                          <Field label="Artist Statement"><textarea rows={3} value={essayEditForm.statement} onChange={ev=>setEssayEditForm(f=>({...f,statement:ev.target.value}))} /></Field>
                          <button className="btn-primary" style={{maxWidth:180}} onClick={saveEssay}>Save Details</button>
                        </div>

                        {/* Photo management */}
                        <div className="essay-edit-section">
                          <p className="essay-edit-section-title">Photos ({essayPhotos.length})</p>

                          {photoError && <p className="photo-error">{photoError}</p>}

                          {/* Upload zone */}
                          <div className="upload-zone-sm" onClick={()=>document.getElementById(`photo-upload-${e.id}`).click()}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            <span>{uploadingPhotos ? "Uploading…" : "Add Photos"}</span>
                            <input id={`photo-upload-${e.id}`} type="file" multiple accept="image/*" style={{display:"none"}}
                              onChange={ev => !uploadingPhotos && uploadPhotos(ev.target.files, e.id)} />
                          </div>

                          {/* Essay reader */
.reader-page { padding-top: var(--header-h); min-height: 100vh; }
.reader-loading { padding-top: var(--header-h); min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.reader-header { max-width: var(--max-w); margin: 0 auto; padding: 28px var(--gutter) 0; display: flex; align-items: center; border-bottom: 1px solid var(--line-2); padding-bottom: 20px; }
.reader-title-block { max-width: 760px; margin: 0 auto; padding: clamp(48px,8vh,96px) var(--gutter) clamp(40px,6vh,72px); }
.reader-genre { font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.reader-genre::before { content:""; display:block; width:20px; height:1px; background:var(--amber); }
.reader-title { font-family: var(--f-serif); font-size: clamp(36px,6vw,72px); font-weight: 400; line-height: 1.06; letter-spacing: -.01em; margin-bottom: 20px; }
.reader-byline { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 32px; }
.reader-statement { font-family: var(--f-body); font-size: clamp(17px,1.5vw,20px); font-style: italic; color: var(--ink-2); line-height: 1.7; padding-top: 28px; border-top: 1px solid var(--line-2); }
.reader-photos { display: flex; flex-direction: column; }
.reader-photo { border-top: 1px solid var(--line-2); }
.reader-photo-img-wrap { max-width: 100%; overflow: hidden; }
.reader-photo-img-wrap img { width: 100%; display: block; max-height: 92vh; object-fit: contain; background: var(--paper-2); }
.reader-caption { max-width: 760px; margin: 0 auto; padding: 16px var(--gutter) 32px; }
.reader-caption-meta { font-family: var(--f-mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px; }
.reader-caption-text { font-family: var(--f-body); font-size: 15px; font-style: italic; color: var(--ink-3); line-height: 1.6; }
.reader-bio-block { border-top: 1px solid var(--line-2); margin-top: 48px; padding: clamp(40px,6vh,72px) var(--gutter); }
.reader-bio-inner { max-width: 760px; margin: 0 auto; display: flex; gap: 24px; align-items: flex-start; }
.reader-bio-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--paper-3); border: 1px solid var(--line-2); display: flex; align-items: center; justify-content: center; font-family: var(--f-serif); font-size: 18px; font-weight: 700; color: var(--ink-3); flex-shrink: 0; }
.reader-bio-name { font-family: var(--f-serif); font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.reader-bio-text { font-family: var(--f-body); font-size: 16px; font-style: italic; color: var(--ink-3); line-height: 1.6; margin-bottom: 14px; }
.reader-bio-links { display: flex; gap: 20px; flex-wrap: wrap; align-items: center; }
.reader-bio-meta { font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; color: var(--muted); }
.card-img--empty { background: var(--paper-3); width: 100%; height: 100%; display: block; }
.single-essay-row { border: 1px solid var(--line-2); }

/* Caption editor */}
                          {editingCaption && (
                            <div className="caption-editor">
                              <p className="essay-edit-section-title">Caption for photo {essayPhotos.findIndex(p=>p.id===editingCaption)+1}</p>
                              <div className="two-col">
                                <Field label="Location"><input value={captionForm.location} onChange={e=>setCaptionForm(f=>({...f,location:e.target.value}))} placeholder="Lisbon, Portugal" /></Field>
                                <Field label="Year"><input type="number" value={captionForm.year} onChange={e=>setCaptionForm(f=>({...f,year:e.target.value}))} placeholder="2025" /></Field>
                              </div>
                              <Field label="Caption text (optional)"><textarea rows={2} value={captionForm.caption} onChange={e=>setCaptionForm(f=>({...f,caption:e.target.value}))} placeholder="Additional context…" /></Field>
                              <div style={{display:"flex",gap:10}}>
                                <button className="btn-more" onClick={()=>setEditingCaption(null)}>Cancel</button>
                                <button className="btn-primary" style={{flex:1}} onClick={()=>saveCaption(editingCaption)}>Save Caption</button>
                              </div>
                            </div>
                          )}

                          {/* Photo grid */}
                          {essayPhotos.length > 0 && (
                            <div className="photo-grid">
                              {essayPhotos.map((photo, idx) => (
                                <div className={`photo-tile${photo.is_cover ? " photo-tile--cover" : ""}`} key={photo.id}>
                                  <img src={photo.display_url || photo.storage_url} alt="" />
                                  {photo.is_cover && <span className="cover-badge">Cover</span>}
                                  <div className="photo-tile-actions">
                                    <button title="Move up" onClick={()=>movePhoto(photo,"up")} disabled={idx===0}>↑</button>
                                    <button title="Move down" onClick={()=>movePhoto(photo,"down")} disabled={idx===essayPhotos.length-1}>↓</button>
                                    {!photo.is_cover && <button title="Set as cover" onClick={()=>setCover(photo)}>⊙</button>}
                                    <button title="Add caption" onClick={()=>openCaption(photo)}>✎</button>
                                    <button title="Delete" className="photo-delete" onClick={()=>{ if(window.confirm("Delete this photo?")) deletePhoto(photo); }}>×</button>
                                  </div>
                                  <span className="photo-num">{idx+1}</span>
                                  {(photo.location || photo.caption) && (
                                    <span className="photo-has-caption" title="Has caption">◉</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={e.id}>
                        <div className="essay-row">
                          {e.cover_url
                            ? <img className="essay-thumb" src={e.cover_url} alt="" />
                            : <div className="essay-thumb-placeholder" />}
                          <div>
                            <div className="essay-row-title">{e.title}</div>
                            <div className="essay-row-meta">{e.genre} · {new Date(e.created_at).toLocaleDateString("en-GB", {month:"short", year:"numeric"})}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
                            <span className={`status-badge ${e.status === "published" ? "published" : e.status === "in_review" ? "review" : "draft"}`}>
                              {e.status === "in_review" ? "In Review" : e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                            </span>
                            {(e.status === "draft" || e.status === "submitted") && (
                              <button className="btn-edit-essay" onClick={()=>openEditEssay(e)} title="Edit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                            {e.status !== "published" && (
                              <button className="btn-edit-essay" style={{color:"#c06060"}} onClick={()=>{ if(window.confirm("Delete this essay and all its photos?")) deleteEssay(e.id); }} title="Delete">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Editor approval bar — only visible to editors/admins */}
                        {profile?.is_editor && (
                          <div className="approval-bar">
                            <span className="approval-label">Editorial</span>
                            <div className="approval-actions">
                              {e.status === "submitted" && (
                                <button className="approval-btn approval-btn--amber" onClick={()=>updateEssayStatus(e.id,"in_review")}>Mark In Review</button>
                              )}
                              {(e.status === "submitted" || e.status === "in_review") && (
                                <>
                                  <button className="approval-btn approval-btn--green" onClick={()=>updateEssayStatus(e.id,"published")}>Publish</button>
                                  <button className="approval-btn approval-btn--red" onClick={()=>updateEssayStatus(e.id,"declined")}>Decline</button>
                                </>
                              )}
                              {e.status === "published" && (
                                <button className="approval-btn approval-btn--red" onClick={()=>updateEssayStatus(e.id,"in_review")}>Unpublish</button>
                              )}
                              {e.status === "declined" && (
                                <button className="approval-btn approval-btn--amber" onClick={()=>updateEssayStatus(e.id,"submitted")}>Reopen</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
            }
            <div style={{marginTop:24}}><button className="btn-submit" onClick={openSubmit}>+ Submit New Essay</button></div>
          </div>
        )}

        {profileTab === "editorial" && profile?.is_editor && (
          <div>
            {reviewingEssay ? (
              <EssayReviewPanel
                essay={reviewingEssay}
                photos={reviewPhotos}
                reviewNote={reviewNote}
                setReviewNote={setReviewNote}
                saveNote={saveNote}
                savingNote={savingNote}
                updateEssayStatus={updateEssayStatus}
                onClose={()=>{ setReviewingEssay(null); fetchEditorSubmissions(); }}
              />
            ) : (
              <>
                {editorSubmissions.length === 0
                  ? <div className="empty-state">No submissions yet.<p>They'll appear here when photographers submit.</p></div>
                  : <div className="essay-list">
                      {editorSubmissions.map(e => (
                        <div className="essay-row" key={e.id} style={{cursor:"pointer"}} onClick={()=>openReview(e)}>
                          <div className="essay-thumb-placeholder"/>
                          <div>
                            <div className="essay-row-title">{e.title}</div>
                            <div className="essay-row-meta">
                              {e.users?.name || "Unknown"} · {e.genre} · {new Date(e.created_at).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}
                            </div>
                          </div>
                          <span className={`status-badge ${e.status==="published"?"published":e.status==="in_review"?"review":"draft"}`}>
                            {e.status==="in_review"?"In Review":e.status.charAt(0).toUpperCase()+e.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                }
              </>
            )}
          </div>
        )}

        {profileTab === "edit" && (
          <div className="edit-form">
            <div className="two-col">
              <Field label="First Name"><input value={editForm.first} onChange={e=>setEditForm(f=>({...f,first:e.target.value}))} placeholder="Maria" /></Field>
              <Field label="Last Name"><input value={editForm.last} onChange={e=>setEditForm(f=>({...f,last:e.target.value}))} placeholder="Solís" /></Field>
            </div>
            <Field label="Bio"><textarea rows={3} value={editForm.bio} onChange={e=>setEditForm(f=>({...f,bio:e.target.value}))} placeholder="Documentary photographer based in Lisbon…" /></Field>
            <div className="two-col">
              <Field label="Website"><input value={editForm.website} onChange={e=>setEditForm(f=>({...f,website:e.target.value}))} placeholder="https://yoursite.com" /></Field>
              <Field label="Instagram"><input value={editForm.instagram} onChange={e=>setEditForm(f=>({...f,instagram:e.target.value}))} placeholder="@handle" /></Field>
            </div>
            <Field label={<>Lineage Node ID <span className="field-note">Links your profile to the graph</span></>}>
              <input value={editForm.lineage_node_id} onChange={e=>setEditForm(f=>({...f,lineage_node_id:e.target.value}))} placeholder="e.g. henri-cartier-bresson" />
            </Field>
            <Field label={<>Influences <span className="field-note">Photographers who shaped your work — matched against Lineage</span></>}>
              <InfluenceInput value={editForm.influences || ""} onChange={v=>setEditForm(f=>({...f,influences:v}))} />
            </Field>
            <button className="btn-primary" style={{maxWidth:200}} onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>
            {saveError && <p style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".12em",color:"#b5441a",marginTop:12,padding:"10px 14px",background:"rgba(181,68,26,.06)",border:"1px solid rgba(181,68,26,.2)"}}>{saveError}</p>}
            {saveSuccess && <p style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--amber)",marginTop:12}}>Changes saved ✓</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Static pages ─────────────────────────────────────────────

function StaticPage({ children, label, title, onNav }) {
  return (
    <div className="static-page">
      <div className="static-hero">
        <div className="static-hero-inner">
          <button className="back-btn" onClick={() => onNav("main")}>← Back</button>
          <p className="section-label">{label}</p>
          <h1 className="static-title" dangerouslySetInnerHTML={{__html: title}} />
        </div>
      </div>
      {children}
      <Footer onNav={onNav} />
    </div>
  );
}

function AboutPage({ onNav }) {
  return (
    <StaticPage label="About" title="Photography deserves a more<br/><em>thoughtful home.</em>" onNav={onNav}>
      <div className="static-body">
        <div className="static-col static-col--wide">
          <p className="static-lead">Aperture is an editorial journal for long-form photo essays. Not a feed. Not a portfolio host. A place where the photograph and the idea behind it are given equal weight.</p>
          <p>We started from a simple observation: the dominant platforms for sharing photography are built around velocity — the next image before the current one has been absorbed. Aperture is built around the opposite impulse. Each essay is a sustained act of looking, and this platform is designed to support that.</p>
          <p>Photo essays published here are selected by a small editorial team. They span documentary, landscape, portrait, street, and fine art — united not by genre but by a commitment to sequencing, context, and authorial intent.</p>
          <p>Aperture is a companion to <a href="https://lineage-two.vercel.app" target="_blank" rel="noreferrer" className="static-link">Lineage</a>, a project that maps documented influence relationships between photographers across generations. Where Lineage looks backward — tracing who shaped whom — Aperture looks at photography being made now.</p>
          <p>We are an independent, non-commercial project. No advertisements, no algorithmic feeds, no engagement metrics. The essays are the product. Everything else is secondary.</p>
        </div>
        <aside className="static-col static-col--narrow">
          {[["Founded","2026"],["Essays Published","0"],["Submissions","Open"],["Companion Project","Lineage →"]].map(([k,v])=>(
            <div className="aside-block" key={k}><p className="aside-label">{k}</p><p className="aside-val">{k==="Companion Project"?<a href="https://lineage-two.vercel.app" target="_blank" rel="noreferrer" className="static-link">{v}</a>:v}</p></div>
          ))}
        </aside>
      </div>
    </StaticPage>
  );
}

function GuidelinesPage({ onNav, openSubmit }) {
  return (
    <StaticPage label="Submissions" title="Submission<br/><em>Guidelines</em>" onNav={onNav}>
      <div className="static-body">
        <div className="static-col static-col--wide">
          <p className="static-lead">Aperture accepts unsolicited submissions from photographers at any stage of their practice. We read everything.</p>
          <h2 className="static-h2">What We Publish</h2>
          <p>Long-form photo essays — sequences of 12 to 60 images organised around a coherent subject, question, or experience. The work should have been made with editorial intent: the images should speak to each other, not just coexist.</p>
          <h2 className="static-h2">Technical Requirements</h2>
          <ul className="static-list">
            {["12–60 photographs per essay","JPEG or TIFF, minimum 2000px on the long edge","sRGB colour profile","Images numbered in intended sequence","One designated cover photograph","No watermarks, frames, or text overlays"].map(i=><li key={i}>{i}</li>)}
          </ul>
          <h2 className="static-h2">What to Include</h2>
          <ul className="static-list">
            {["A brief photographer bio (100–200 words)","An artist statement (150–400 words)","Basic caption information: location, year","Key influences — this seeds your Lineage node"].map(i=><li key={i}>{i}</li>)}
          </ul>
          <h2 className="static-h2">Rights</h2>
          <p>You retain full copyright of your work. By submitting, you grant Aperture a non-exclusive licence to publish the essay on this platform.</p>
        </div>
        <aside className="static-col static-col--narrow">
          {[["Response Time","2–3 weeks"],["Images per Essay","12 – 60"],["Submission Fee","None"],["Rights Retained","100% yours"]].map(([k,v])=>(
            <div className="aside-block" key={k}><p className="aside-label">{k}</p><p className="aside-val">{v}</p></div>
          ))}
          <div className="aside-block"><button className="btn-primary" style={{width:"100%",marginTop:8}} onClick={openSubmit}>Submit Your Work</button></div>
        </aside>
      </div>
    </StaticPage>
  );
}

function EditorialPage({ onNav }) {
  const sections = [
    ["On Selection","We select work on the strength of its sequencing, its internal coherence, and the clarity of its authorial intent. Technical excellence matters, but it is not sufficient. We have published work made on smartphones and declined work made on medium format."],
    ["On Editing","We edit sequences collaboratively with photographers. We do not impose a house style. Edits are always proposed, never imposed. No image is removed or reordered without the photographer's agreement."],
    ["On Captions and Context","We require accurate caption information — location and year at minimum. We do not fabricate context. We believe photography's relationship to truth is complicated, and we are not interested in pretending otherwise."],
    ["On Post-Processing","We do not publish work in which elements have been added, removed, or substantially repositioned through post-processing in documentary or street genres. Fine art work is assessed case by case."],
    ["On Corrections","We correct factual errors promptly and transparently. If an error is found after publication, we note the correction at the bottom of the essay with a date. We do not silently edit published work."],
    ["On Independence","Aperture accepts no advertising and has no commercial relationships with gear manufacturers, galleries, or agencies. Editorial decisions are made without commercial consideration."],
  ];
  return (
    <StaticPage label="Editorial" title="Editorial<br/><em>Standards</em>" onNav={onNav}>
      <div className="static-body">
        <div className="static-col static-col--wide">
          <p className="static-lead">These are the principles that guide every editorial decision we make — from what we accept to how we write about the work we publish.</p>
          {sections.map(([h,p])=><><h2 className="static-h2" key={h}>{h}</h2><p key={p}>{p}</p></>)}
        </div>
        <aside className="static-col static-col--narrow">
          {[["Advertising","None, ever"],["Editorial Independence","Complete"],["Corrections Policy","Transparent & dated"],["Post-Processing","Disclosed in statement"]].map(([k,v])=>(
            <div className="aside-block" key={k}><p className="aside-label">{k}</p><p className="aside-val">{v}</p></div>
          ))}
        </aside>
      </div>
    </StaticPage>
  );
}

function FaqPage({ onNav }) {
  const faqs = [
    ["Do I need to be a professional photographer to submit?","No. We assess the work, not the résumé. Students, hobbyists, and emerging photographers submit regularly and have been published."],
    ["Can I submit work that has been published elsewhere?","Yes, with disclosure. Please note in your artist statement where the work has previously appeared."],
    ["What is the Lineage connection?","Lineage maps influence relationships between photographers as an interactive graph. When you submit to Aperture, your influences field is used to build or connect your node in Lineage, linking your essays to photography's broader history."],
    ["Do you accept colour and black-and-white work?","Yes to both, and mixed essays too. The relationship between image and intent matters more than the choice of palette."],
    ["What happens if my submission is declined?","You'll receive a response within three weeks. Declined work can be resubmitted after significant revision."],
    ["Can I remove my work after it's been published?","Yes. Contact us and we will unpublish the essay within 48 hours."],
    ["Is there a fee to submit or to read?","No fees of any kind. Submission is free. Reading is free."],
  ];
  return (
    <StaticPage label="FAQ" title="Frequently<br/><em>Asked Questions</em>" onNav={onNav}>
      <div className="static-body">
        <div className="static-col static-col--wide">
          <div className="faq-list">
            {faqs.map(([q,a])=>(
              <div className="faq-item" key={q}>
                <h3 className="faq-q">{q}</h3>
                <p className="faq-a">{a}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="static-col static-col--narrow">
          <div className="aside-block">
            <p className="aside-label">Still have a question?</p>
            <p className="aside-val" style={{fontSize:15,marginTop:4,lineHeight:1.5}}>Write to us — we read everything.</p>
            <button className="btn-submit" style={{marginTop:16,width:"100%",padding:10}} onClick={()=>onNav("contact")}>Contact Us</button>
          </div>
        </aside>
      </div>
    </StaticPage>
  );
}

function ContactPage({ onNav }) {
  const [sent, setSent] = useState(false);
  return (
    <StaticPage label="Contact" title="Get in<br/><em>Touch</em>" onNav={onNav}>
      <div className="static-body">
        <div className="static-col static-col--wide">
          <p className="static-lead">We read every message. Response time is typically two to five working days.</p>
          <h2 className="static-h2">Write to Us</h2>
          <Field label="Your Name"><input type="text" placeholder="Maria Solís" /></Field>
          <Field label="Email"><input type="email" placeholder="you@example.com" /></Field>
          <Field label="Subject">
            <select>
              {["Submission query","Technical issue","Editorial question","Press or collaboration","Something else"].map(o=><option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Message"><textarea rows={5} placeholder="Your message…" /></Field>
          {!sent
            ? <button className="btn-primary" style={{maxWidth:200}} onClick={()=>setSent(true)}>Send Message</button>
            : <p style={{fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--amber)"}}>Message sent ✓</p>
          }
          <div style={{marginTop:48,paddingTop:28,borderTop:"1px solid var(--line-2)"}}>
            <h2 className="static-h2">Direct Contact</h2>
            <p>For urgent matters: <a href="mailto:hello@aperture.journal" className="static-link">hello@aperture.journal</a></p>
            <p style={{marginTop:12}}>For Lineage questions: <a href="https://lineage-two.vercel.app" target="_blank" rel="noreferrer" className="static-link">lineage-two.vercel.app →</a></p>
          </div>
        </div>
        <aside className="static-col static-col--narrow">
          {[["Response Time","2–5 working days"],["Submissions","Via the submit form only"],["Press","hello@aperture.journal"]].map(([k,v])=>(
            <div className="aside-block" key={k}><p className="aside-label">{k}</p><p className="aside-val">{v}</p></div>
          ))}
        </aside>
      </div>
    </StaticPage>
  );
}

// ─── Shared components ────────────────────────────────────────

function Modal({ children, onClose, wide }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide?" modal--wide":""}`}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function EssayReaderPage({ essay: essayData, loading, saved, onSave, onNav }) {
  if (loading || !essayData) {
    return (
      <div className="reader-loading">
        <p>Loading essay…</p>
      </div>
    );
  }
  const { essay, photos, photographer } = essayData;
  const isSaved = saved.includes(essay.id);

  return (
    <div className="reader-page">
      {/* Reader header */}
      <div className="reader-header">
        <button className="back-btn" onClick={()=>onNav("main")}>← All Essays</button>
        <button className={`card-save${isSaved?" saved":""}`} onClick={()=>onSave(essay.id)} title={isSaved?"Saved":"Save essay"} style={{marginLeft:"auto"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      {/* Essay title block */}
      <div className="reader-title-block">
        <p className="reader-genre">{essay.genre}</p>
        <h1 className="reader-title">{essay.title}</h1>
        <div className="reader-byline">
          <span>{photographer?.name}</span>
          {essay.published_at && <><span className="card-sep">·</span><span>{new Date(essay.published_at).toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</span></>}
          <span className="card-sep">·</span>
          <span>{photos.length} photograph{photos.length!==1?"s":""}</span>
        </div>
        {essay.statement && (
          <p className="reader-statement">{essay.statement}</p>
        )}
      </div>

      {/* Photo sequence */}
      <div className="reader-photos">
        {photos.map((photo, idx) => (
          <div className="reader-photo" key={photo.id}>
            <div className="reader-photo-img-wrap">
              <img src={photo.display_url || photo.storage_url} alt={photo.caption || ""} />
            </div>
            {(photo.location || photo.year || photo.caption) && (
              <div className="reader-caption">
                {(photo.location || photo.year) && (
                  <span className="reader-caption-meta">
                    {[photo.location, photo.year].filter(Boolean).join(", ")}
                  </span>
                )}
                {photo.caption && <p className="reader-caption-text">{photo.caption}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photographer bio */}
      {photographer && (
        <div className="reader-bio-block">
          <div className="reader-bio-inner">
            <div className="reader-bio-avatar">{(photographer.name||"?")[0].toUpperCase()}</div>
            <div>
              <p className="reader-bio-name">{photographer.name}</p>
              {photographer.bio && <p className="reader-bio-text">{photographer.bio}</p>}
              <div className="reader-bio-links">
                {photographer.website && <a href={photographer.website} target="_blank" rel="noreferrer" className="static-link">{photographer.website}</a>}
                {photographer.instagram && <span className="reader-bio-meta">{photographer.instagram}</span>}
                {photographer.lineage_node_id && (
                  <a href={`https://lineage-two.vercel.app/?node=${photographer.lineage_node_id}`} target="_blank" rel="noreferrer" className="static-link">View on Lineage →</a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{height:80}}/>
    </div>
  );
}

function EssayReviewPanel({ essay, photos, reviewNote, setReviewNote, saveNote, savingNote, updateEssayStatus, onClose }) {
  const photographer = essay.users || {};
  return (
    <div className="review-panel">
      <div className="review-panel-header">
        <button className="btn-edit-close" onClick={onClose}>← All Submissions</button>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span className={`status-badge ${essay.status==="published"?"published":essay.status==="in_review"?"review":"draft"}`}>
            {essay.status==="in_review"?"In Review":essay.status.charAt(0).toUpperCase()+essay.status.slice(1)}
          </span>
          {essay.status==="submitted" && <button className="approval-btn approval-btn--amber" onClick={()=>updateEssayStatus(essay.id,"in_review")}>Mark In Review</button>}
          {(essay.status==="submitted"||essay.status==="in_review") && <>
            <button className="approval-btn approval-btn--green" onClick={()=>{ updateEssayStatus(essay.id,"published"); onClose(); }}>Publish</button>
            <button className="approval-btn approval-btn--red" onClick={()=>{ updateEssayStatus(essay.id,"declined"); onClose(); }}>Decline</button>
          </>}
          {essay.status==="published" && <button className="approval-btn approval-btn--red" onClick={()=>updateEssayStatus(essay.id,"in_review")}>Unpublish</button>}
          {essay.status==="declined" && <button className="approval-btn approval-btn--amber" onClick={()=>updateEssayStatus(essay.id,"submitted")}>Reopen</button>}
        </div>
      </div>

      <div className="review-grid">
        <div className="review-main">
          <h2 className="review-essay-title">{essay.title}</h2>
          <p className="review-essay-genre">{essay.genre}</p>

          {essay.statement && <>
            <h3 className="review-section-head">Artist Statement</h3>
            <p className="review-text">{essay.statement}</p>
          </>}

          <h3 className="review-section-head">Photographs ({photos.length})</h3>
          {photos.length === 0
            ? <p className="review-text" style={{opacity:.5,fontStyle:"italic"}}>No photographs uploaded yet.</p>
            : <div className="review-photos">
                {photos.map((photo, idx) => (
                  <div className="review-photo" key={photo.id}>
                    <div className="review-photo-img-wrap">
                      <img src={photo.display_url || photo.storage_url} alt="" />
                      {photo.is_cover && <span className="cover-badge">Cover</span>}
                      <span className="photo-num">{idx+1}</span>
                    </div>
                    <div className="review-photo-meta">
                      {photo.location && <span>{photo.location}</span>}
                      {photo.year && <span>{photo.year}</span>}
                      {photo.caption && <p className="review-photo-caption">{photo.caption}</p>}
                      {!photo.location && !photo.year && !photo.caption && (
                        <span style={{opacity:.4,fontStyle:"italic",fontSize:13}}>No caption</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          }

          <h3 className="review-section-head">Editorial Note</h3>
          <div className="field">
            <textarea rows={4} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Internal notes — not visible to the photographer…" style={{width:"100%",background:"var(--paper-2)",border:"1px solid var(--line-2)",padding:"11px 14px",fontFamily:"var(--f-body)",fontSize:16,color:"var(--ink)",outline:"none",resize:"vertical"}} />
          </div>
          <button className="btn-primary" style={{maxWidth:180}} onClick={saveNote} disabled={savingNote}>
            {savingNote?"Saving…":"Save Note"}
          </button>
        </div>

        <aside className="review-aside">
          <h3 className="review-section-head">Photographer</h3>
          <div className="aside-block"><p className="aside-label">Name</p><p className="aside-val">{photographer.name||"—"}</p></div>
          {photographer.bio && <div className="aside-block"><p className="aside-label">Bio</p><p className="aside-val" style={{fontSize:14,lineHeight:1.6}}>{photographer.bio}</p></div>}
          {photographer.instagram && <div className="aside-block"><p className="aside-label">Instagram</p><p className="aside-val">{photographer.instagram}</p></div>}
          {photographer.website && <div className="aside-block"><p className="aside-label">Website</p><p className="aside-val"><a href={photographer.website} target="_blank" rel="noreferrer" className="static-link">{photographer.website}</a></p></div>}
          {essay.influences && <div className="aside-block"><p className="aside-label">Influences</p><p className="aside-val" style={{fontSize:14,lineHeight:1.6}}>{essay.influences}</p></div>}
          {photographer.lineage_node_id && <div className="aside-block"><p className="aside-label">Lineage Node</p><p className="aside-val"><a href={`https://lineage-two.vercel.app/?node=${photographer.lineage_node_id}`} target="_blank" rel="noreferrer" className="static-link">{photographer.lineage_node_id}</a></p></div>}
          <div className="aside-block"><p className="aside-label">Submitted</p><p className="aside-val" style={{fontSize:14}}>{new Date(essay.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p></div>
        </aside>
      </div>
    </div>
  );
}

function InfluenceInput({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("photographers")
      .select("id, name")
      .ilike("name", `%${q}%`)
      .limit(6);
    setResults(data || []);
    setLoading(false);
  };

  const add = (name) => {
    if (!tags.includes(name)) onChange([...tags, name].join(", "));
    setQuery(""); setResults([]);
  };

  const remove = (tag) => onChange(tags.filter(t => t !== tag).join(", "));

  return (
    <div className="influence-input">
      {tags.length > 0 && (
        <div className="influence-tags">
          {tags.map(t => (
            <span className="influence-tag" key={t}>
              {t}
              <button onClick={() => remove(t)}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="influence-search-wrap">
        <input
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search photographers in Lineage…"
          className="influence-search"
        />
        {loading && <span className="influence-loading">…</span>}
      </div>
      {results.length > 0 && (
        <div className="influence-dropdown">
          {results.map(p => (
            <button key={p.id} className="influence-option" onClick={() => add(p.name)}>
              <span className="influence-option-name">{p.name}</span>
              <span className="influence-option-id">{p.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Footer({ onNav }) {
  return (
    <footer>
      <div className="footer-inner">
        <span className="footer-logo">Aperture</span>
        <div className="footer-links">
          {[["about","About"],["guidelines","Guidelines"],["editorial","Editorial Standards"],["faq","FAQ"],["contact","Contact"]].map(([p,l])=>(
            <a key={p} href="#" className="footer-link" onClick={e=>{e.preventDefault();onNav(p);}}>{l}</a>
          ))}
          <a href="https://lineage-two.vercel.app" target="_blank" rel="noreferrer" className="footer-link">Lineage →</a>
        </div>
        <span className="footer-copy">© 2026 Aperture Journal</span>
      </div>
    </footer>
  );
}

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --paper:   #f5f2ec;
  --paper-2: #ede9e0;
  --paper-3: #e0dbd0;
  --ink:     #1a1814;
  --ink-2:   #2e2b26;
  --ink-3:   #4a4640;
  --ink-4:   #6b6660;
  --amber:   #9c7a3c;
  --green:   #4a7c59;
  --line:    rgba(26,24,20,0.10);
  --line-2:  rgba(26,24,20,0.18);
  --muted:   rgba(26,24,20,0.42);
  --f-serif: "Libre Baskerville", Georgia, serif;
  --f-body:  "EB Garamond", Georgia, serif;
  --f-mono:  "Courier Prime", "Courier New", monospace;
  --max-w:   1280px;
  --gutter:  clamp(24px, 5vw, 64px);
  --header-h:58px;
}

@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Courier+Prime:ital,wght@0,400;1,400&display=swap');

html { scroll-behavior: smooth; color-scheme: light; }
body { background: var(--paper); color: var(--ink); font-family: var(--f-body); font-size: 18px; line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

/* Header */
header { position: fixed; top: 0; left: 0; right: 0; height: var(--header-h); z-index: 200; background: var(--paper); border-bottom: 1px solid var(--line-2); display: flex; align-items: center; padding: 0 var(--gutter); }
.header-inner { width: 100%; max-width: var(--max-w); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
.logo { font-family: var(--f-serif); font-size: 15px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: var(--ink); text-decoration: none; }
.logo-dot { display: inline-block; width: 5px; height: 5px; background: var(--amber); border-radius: 50%; margin-left: 3px; vertical-align: middle; position: relative; top: -1px; }
.header-right { display: flex; align-items: center; gap: 20px; }
.header-meta { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; color: var(--muted); }
.btn-submit { font-family: var(--f-mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink); background: none; border: 1px solid var(--line-2); padding: 8px 18px; cursor: pointer; transition: border-color .2s; }
.btn-submit:hover { border-color: var(--ink); }
.btn-account { background: none; border: 1px solid var(--line-2); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-3); transition: border-color .2s, background .2s; flex-shrink: 0; }
.btn-account:hover { border-color: var(--ink); }
.btn-account.logged-in { background: var(--amber); border-color: var(--amber); color: var(--paper); }
.avatar-initial { font-family: var(--f-serif); font-size: 13px; font-weight: 700; }

/* Hero */
.main-page { padding-top: var(--header-h); }
.hero { border-bottom: 1px solid var(--line-2); }
.hero-inner { max-width: var(--max-w); margin: 0 auto; padding: clamp(64px,10vh,120px) var(--gutter) 0; display: grid; grid-template-columns: 1fr; align-items: end; }
.hero-left { padding-bottom: clamp(40px,6vh,72px); max-width: 680px; }
.hero-kicker { font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); margin-bottom: 28px; display: flex; align-items: center; gap: 10px; opacity: 1; }
.hero-kicker::before { content:""; display:block; width:24px; height:1px; background:var(--amber); }
.hero-title { font-family: var(--f-serif); font-size: clamp(40px,6vw,82px); font-weight: 400; line-height: 1.08; letter-spacing: -.01em; }
.hero-title em { font-style: italic; color: var(--ink-3); }
.hero-desc { margin-top: 28px; font-size: clamp(17px,1.5vw,20px); font-style: italic; color: var(--ink-2); line-height: 1.55; max-width: 560px; }
.hero-actions { margin-top: 40px; display: flex; align-items: center; gap: 28px; }
.btn-read { font-family: var(--f-mono); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--ink); text-decoration: none; display: flex; align-items: center; gap: 10px; transition: color .2s; background: none; border: none; cursor: pointer; padding: 0; }
.btn-read:hover { color: var(--amber); }
.btn-read-rule { display:block; width:32px; height:1px; background:currentColor; transition:width .3s; }
.btn-read:hover .btn-read-rule { width: 52px; }
.hero-byline { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; color: var(--muted); }
.hero-right { opacity: 1; }
.hero-img-wrap { overflow: hidden; aspect-ratio: 3/4; }
.hero-img-wrap img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(30%); transition: filter .6s, transform .6s; display: block; }
.hero-img-wrap:hover img { filter: grayscale(0%); transform: scale(1.02); }
.hero-img-caption { margin-top: 12px; font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; justify-content: space-between; }
.hero-stats { border-top: 1px solid var(--line-2); margin-top: clamp(40px,6vh,64px); }
.hero-stats-inner { max-width: var(--max-w); margin: 0 auto; padding: 0 var(--gutter); display: grid; grid-template-columns: repeat(3,1fr); }
.stat-item { padding: 20px 0; border-right: 1px solid var(--line-2); display: flex; align-items: baseline; gap: 12px; }
.stat-item:last-child { border-right: none; }
.stat-item:not(:first-child) { padding-left: clamp(20px,3vw,40px); }
.stat-num { font-family: var(--f-serif); font-size: clamp(22px,2.5vw,32px); font-weight: 700; line-height: 1; }
.stat-label { font-family: var(--f-mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }

/* Essays grid */
.essays-section { padding: clamp(72px,10vh,120px) 0; }
.section-head { max-width: var(--max-w); margin: 0 auto; padding: 0 var(--gutter); display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 48px; border-bottom: 1px solid var(--line-2); padding-bottom: 20px; }
.section-label { font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); }
.section-title { font-family: var(--f-serif); font-size: clamp(22px,3vw,34px); font-weight: 400; letter-spacing: -.01em; margin-top: 6px; }
.section-count { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; color: var(--muted); }
.essays-wrap { max-width: var(--max-w); margin: 0 auto; padding: 0 var(--gutter); }
.featured-row { display: grid; grid-template-columns: 2fr 1fr; gap: 1px; background: var(--line-2); margin-bottom: 1px; border: 1px solid var(--line-2); }
.stacked-col { display: flex; flex-direction: column; gap: 1px; background: var(--line-2); }
.standard-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--line-2); border: 1px solid var(--line-2); }

/* Card */
.card { overflow: hidden; background: var(--paper); display: flex; flex-direction: column; }
.card-img-wrap { overflow: hidden; aspect-ratio: 4/3; flex-shrink: 0; }
.card--large .card-img-wrap { aspect-ratio: 4/3; }
.card-img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(85%); transition: filter .65s, transform .65s; }
.card:hover .card-img { filter: grayscale(0%); transform: scale(1.025); }
.card-body { padding: 20px 22px 24px; flex: 1; display: flex; flex-direction: column; border-top: 1px solid var(--line); }
.card--large .card-body { padding: 24px 28px 28px; }
.card-genre { font-family: var(--f-mono); font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); margin-bottom: 10px; }
.card-title { font-family: var(--f-serif); font-size: clamp(16px,1.4vw,20px); font-weight: 400; line-height: 1.25; flex: 1; }
.card--large .card-title { font-size: clamp(20px,2vw,28px); }
.card-meta { margin-top: 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.card-author { color: var(--ink-3); font-style: italic; font-family: var(--f-body); font-size: 11px; letter-spacing: .03em; text-transform: none; }
.card-sep { opacity: .4; }
.card-actions { display: flex; align-items: center; gap: 16px; margin-top: 14px; }
.card-link { font-family: var(--f-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-4); text-decoration: none; display: flex; align-items: center; gap: 8px; opacity: 0; transform: translateY(4px); transition: opacity .3s, transform .3s, color .2s; }
.card:hover .card-link { opacity: 1; transform: translateY(0); color: var(--amber); }
.card-link-rule { display: block; width: 20px; height: 1px; background: currentColor; transition: width .3s; flex-shrink: 0; }
.card:hover .card-link-rule { width: 32px; }
.card-save { background: none; border: none; cursor: pointer; padding: 2px; color: var(--muted); display: flex; align-items: center; opacity: 0; transform: translateY(4px); transition: opacity .3s, transform .3s, color .2s; }
.card:hover .card-save { opacity: 1; transform: translateY(0); }
.card-save:hover, .card-save.saved { color: var(--amber); opacity: 1; transform: translateY(0); }

/* Load more */
.load-more-row { margin-top: 48px; display: flex; align-items: center; gap: 20px; }
.load-rule { flex: 1; height: 1px; background: var(--line-2); }
.btn-more { font-family: var(--f-mono); font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); background: none; border: 1px solid var(--line-2); padding: 10px 24px; cursor: pointer; transition: color .2s, border-color .2s; }
.btn-more:hover { color: var(--ink); border-color: var(--ink-3); }

/* Footer */
footer { border-top: 1px solid var(--line-2); padding: 32px var(--gutter); margin-top: clamp(72px,10vh,120px); }
.footer-inner { max-width: var(--max-w); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.footer-logo { font-family: var(--f-serif); font-size: 12px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--ink-4); }
.footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
.footer-link { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); text-decoration: none; transition: color .2s; }
.footer-link:hover { color: var(--ink); }
.footer-copy { font-family: var(--f-mono); font-size: 9px; letter-spacing: .1em; color: var(--muted); opacity: .6; }

/* Profile */
.profile-page { padding-top: var(--header-h); min-height: 100vh; }
.profile-hero { border-bottom: 1px solid var(--line-2); }
.profile-hero-inner { max-width: var(--max-w); margin: 0 auto; padding: clamp(48px,8vh,96px) var(--gutter) 28px; display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 24px; }
.profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--paper-3); border: 1px solid var(--line-2); display: flex; align-items: center; justify-content: center; font-family: var(--f-serif); font-size: 22px; font-weight: 700; color: var(--ink-3); flex-shrink: 0; }
.profile-name { font-family: var(--f-serif); font-size: clamp(26px,4vw,44px); font-weight: 400; }
.profile-bio { margin-top: 4px; font-style: italic; color: var(--ink-3); font-size: 16px; }
.profile-hero-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.btn-lineage { font-family: var(--f-mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: var(--amber); text-decoration: none; border: 1px solid var(--amber); padding: 8px 14px; display: flex; align-items: center; gap: 7px; transition: background .2s, color .2s; white-space: nowrap; }
.btn-lineage:hover { background: var(--amber); color: var(--paper); }
.btn-signout { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0; transition: color .2s; }
.btn-signout:hover { color: var(--ink); }
.profile-tabs { max-width: var(--max-w); margin: 0 auto; padding: 0 var(--gutter); display: flex; border-bottom: 1px solid var(--line-2); }
.profile-tab { font-family: var(--f-mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; padding: 18px 0; margin-right: 28px; cursor: pointer; transition: color .2s, border-color .2s; position: relative; bottom: -1px; }
.profile-tab.active { color: var(--ink); border-bottom-color: var(--ink); }
.profile-content { max-width: var(--max-w); margin: 0 auto; padding: clamp(32px,5vh,56px) var(--gutter); }
.essay-list { display: flex; flex-direction: column; border: 1px solid var(--line-2); }
.essay-row { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 20px; background: var(--paper); padding: 16px 20px; border-bottom: 1px solid var(--line); transition: background .2s; }
.essay-row:last-child { border-bottom: none; }
.essay-row:hover { background: var(--paper-2); }
.essay-thumb { width: 72px; height: 52px; object-fit: cover; filter: grayscale(60%); display: block; }
.essay-row-title { font-family: var(--f-serif); font-size: 17px; }
.essay-row-meta { font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
.status-badge { font-family: var(--f-mono); font-size: 8px; letter-spacing: .16em; text-transform: uppercase; padding: 4px 10px; white-space: nowrap; }
.status-badge.published { background: rgba(74,124,89,.12); color: var(--green); }
.status-badge.review    { background: rgba(156,122,60,.12); color: var(--amber); }
.status-badge.draft     { background: var(--paper-3); color: var(--ink-4); }
.empty-state { text-align: center; padding: 64px 0; font-style: italic; color: var(--muted); font-size: 17px; }
.empty-state p { margin-top: 8px; font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); opacity: .6; }
.edit-form { max-width: 600px; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 500; background: rgba(245,242,236,.8); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: var(--gutter); }
.modal { background: var(--paper); border: 1px solid var(--line-2); width: 100%; max-width: 440px; position: relative; max-height: 90vh; overflow-y: auto; }
.modal--wide { max-width: 520px; }
.modal-close { position: absolute; top: 16px; right: 18px; background: none; border: none; cursor: pointer; color: var(--muted); font-size: 22px; line-height: 1; transition: color .2s; z-index: 1; }
.modal-close:hover { color: var(--ink); }
.modal-body { padding: 32px; }
.modal-title { font-family: var(--f-serif); font-size: 22px; font-weight: 400; margin-bottom: 24px; }
.modal-tabs { display: flex; border-bottom: 1px solid var(--line-2); margin-bottom: 24px; }
.modal-tab { font-family: var(--f-mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 0; margin-right: 24px; cursor: pointer; transition: color .2s, border-color .2s; position: relative; bottom: -1px; }
.modal-tab.active { color: var(--ink); border-bottom-color: var(--ink); }
.modal-alt { margin-top: 16px; text-align: center; font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; color: var(--muted); }
.modal-alt button { background: none; border: none; cursor: pointer; color: var(--amber); font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; text-decoration: underline; padding: 0; }
.auth-error { font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; color: #b5441a; margin-bottom: 16px; padding: 10px 14px; background: rgba(181,68,26,.06); border: 1px solid rgba(181,68,26,.2); }

/* Form */
.field { margin-bottom: 18px; }
.field label { display: block; font-family: var(--f-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.field input, .field textarea, .field select { width: 100%; background: var(--paper-2); border: 1px solid var(--line-2); padding: 11px 14px; font-family: var(--f-body); font-size: 16px; color: var(--ink); outline: none; transition: border-color .2s; appearance: none; -webkit-appearance: none; resize: vertical; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--amber); }
.field-note { color: var(--amber); font-family: var(--f-mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.btn-primary { width: 100%; font-family: var(--f-mono); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--paper); background: var(--ink); border: none; padding: 14px; cursor: pointer; transition: background .2s; }
.btn-primary:hover { background: var(--ink-2); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* Submit wizard */
.submit-steps { display: flex; align-items: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--line-2); }
.step-dot { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line-2); background: var(--paper); display: flex; align-items: center; justify-content: center; font-family: var(--f-mono); font-size: 9px; color: var(--muted); flex-shrink: 0; transition: all .2s; }
.step-dot.active { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.step-dot.done   { background: var(--amber); border-color: var(--amber); color: var(--paper); }
.step-line { flex: 1; height: 1px; background: var(--line-2); }
.step-title { font-family: var(--f-serif); font-size: 20px; font-weight: 400; margin-bottom: 20px; }
.step-nav { display: flex; gap: 12px; margin-top: 4px; }
.step-nav .btn-more { flex: 1; }
.step-nav .btn-primary { flex: 2; }
.upload-zone { border: 1px dashed var(--line-2); padding: 36px; text-align: center; cursor: pointer; transition: border-color .2s; background: var(--paper-2); }
.upload-zone:hover { border-color: var(--amber); }
.upload-zone p { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-top: 10px; }
.file-count { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--amber); margin-top: 12px; text-align: center; }
.review-row { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 1px solid var(--line); }
.review-row:last-of-type { border-bottom: none; margin-bottom: 16px; }
.review-key { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.review-val { font-family: var(--f-body); font-size: 16px; color: var(--ink-2); text-align: right; max-width: 240px; }
.success-state { text-align: center; padding: 16px 0; }
.success-check { font-size: 36px; margin-bottom: 16px; }
.success-state h3 { font-family: var(--f-serif); font-size: 22px; font-weight: 400; margin-bottom: 10px; }
.success-state p { font-style: italic; color: var(--ink-3); }

/* Static pages */
.static-page { padding-top: var(--header-h); min-height: 100vh; }
.back-btn { font-family: var(--f-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 32px; transition: color .2s; }
.back-btn:hover { color: var(--ink); }
.static-hero { border-bottom: 1px solid var(--line-2); }
.static-hero-inner { max-width: var(--max-w); margin: 0 auto; padding: clamp(48px,8vh,96px) var(--gutter) clamp(32px,5vh,56px); }
.static-title { font-family: var(--f-serif); font-size: clamp(36px,5.5vw,72px); font-weight: 400; line-height: 1.08; letter-spacing: -.01em; margin-top: 16px; }
.static-title em { font-style: italic; color: var(--ink-3); }
.static-body { max-width: var(--max-w); margin: 0 auto; padding: clamp(40px,6vh,72px) var(--gutter) clamp(72px,10vh,120px); display: grid; grid-template-columns: 1fr 280px; gap: clamp(40px,6vw,96px); align-items: start; }
.static-col--wide p { margin-bottom: 18px; font-size: clamp(16px,1.3vw,19px); line-height: 1.7; }
.static-lead { font-size: clamp(18px,1.6vw,22px) !important; font-style: italic; color: var(--ink-2); margin-bottom: 32px !important; padding-bottom: 32px; border-bottom: 1px solid var(--line-2); }
.static-h2 { font-family: var(--f-serif); font-size: clamp(16px,1.4vw,20px); font-weight: 700; margin-top: 32px; margin-bottom: 12px; }
.static-list { list-style: none; margin-bottom: 18px; }
.static-list li { font-size: clamp(16px,1.3vw,19px); line-height: 1.7; padding: 6px 0 6px 18px; border-bottom: 1px solid var(--line); position: relative; }
.static-list li::before { content: "—"; position: absolute; left: 0; color: var(--amber); }
.static-link { color: var(--amber); text-decoration: none; border-bottom: 1px solid currentColor; transition: color .2s; }
.static-link:hover { color: var(--amber-2, #b8923f); }
.static-col--narrow { position: sticky; top: calc(var(--header-h) + 32px); }
.aside-block { padding: 14px 0; border-bottom: 1px solid var(--line-2); }
.aside-block:first-child { border-top: 1px solid var(--line-2); }
.aside-label { font-family: var(--f-mono); font-size: 9px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
.aside-val { font-family: var(--f-serif); font-size: 17px; font-weight: 400; line-height: 1.3; }
.faq-list { display: flex; flex-direction: column; }
.faq-item { padding: 26px 0; border-bottom: 1px solid var(--line-2); }
.faq-item:first-child { border-top: 1px solid var(--line-2); }
.faq-q { font-family: var(--f-serif); font-size: clamp(16px,1.3vw,19px); font-weight: 700; margin-bottom: 10px; line-height: 1.3; }
.faq-a { font-size: clamp(15px,1.2vw,17px); color: var(--ink-3); line-height: 1.7; }
.essay-thumb-placeholder { width: 72px; height: 52px; background: var(--paper-3); flex-shrink: 0; }
.essay-edit-panel { padding: 24px; background: var(--paper-2); border-bottom: 1px solid var(--line-2); }
.essay-edit-label { font-family: var(--f-mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: var(--amber); margin-bottom: 20px; }
.btn-edit-essay { background: none; border: 1px solid var(--line-2); padding: 6px 8px; cursor: pointer; color: var(--muted); display: flex; align-items: center; transition: color .2s, border-color .2s; }
.btn-edit-essay:hover { color: var(--ink); border-color: var(--ink); }
.essay-edit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.btn-edit-close { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); background: none; border: none; cursor: pointer; transition: color .2s; }
.btn-edit-close:hover { color: var(--ink); }
.essay-edit-section { padding: 24px 0; border-top: 1px solid var(--line-2); }
.essay-edit-section:first-of-type { border-top: none; padding-top: 0; }
.essay-edit-section-title { font-family: var(--f-mono); font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); margin-bottom: 20px; }
.upload-zone-sm { display: flex; align-items: center; gap: 10px; border: 1px dashed var(--line-2); padding: 14px 18px; cursor: pointer; margin-bottom: 20px; background: var(--paper-2); transition: border-color .2s; font-family: var(--f-mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.upload-zone-sm:hover { border-color: var(--amber); color: var(--amber); }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.photo-tile { position: relative; aspect-ratio: 1; overflow: hidden; background: var(--paper-3); }
.photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(20%); transition: filter .3s; }
.photo-tile:hover img { filter: grayscale(0%); }
.photo-tile--cover { outline: 2px solid var(--amber); }
.cover-badge { position: absolute; top: 6px; left: 6px; font-family: var(--f-mono); font-size: 7px; letter-spacing: .14em; text-transform: uppercase; background: var(--amber); color: var(--paper); padding: 2px 6px; }
.photo-num { position: absolute; bottom: 5px; left: 7px; font-family: var(--f-mono); font-size: 9px; color: rgba(245,242,236,.7); }
.photo-tile-actions { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: rgba(26,24,20,.55); display: flex; align-items: center; justify-content: center; gap: 6px; opacity: 0; transition: opacity .2s; }
.photo-tile:hover .photo-tile-actions { opacity: 1; }
.photo-tile-actions button { background: rgba(245,242,236,.15); border: 1px solid rgba(245,242,236,.3); color: var(--paper); width: 26px; height: 26px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: background .2s; }
.photo-tile-actions button:hover { background: rgba(245,242,236,.3); }
.photo-tile-actions button:disabled { opacity: .3; cursor: not-allowed; }
.photo-delete { color: #e06060 !important; }
.approval-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: var(--paper-2); border-bottom: 1px solid var(--line-2); border-top: 1px solid var(--line); }
.approval-label { font-family: var(--f-mono); font-size: 8px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.approval-actions { display: flex; gap: 8px; }
.approval-btn { font-family: var(--f-mono); font-size: 9px; letter-spacing: .14em; text-transform: uppercase; background: none; border: 1px solid var(--line-2); padding: 5px 12px; cursor: pointer; transition: background .2s, color .2s, border-color .2s; color: var(--ink-3); }
.approval-btn--green { border-color: rgba(74,124,89,.4); color: var(--green); }
.approval-btn--green:hover { background: var(--green); color: var(--paper); border-color: var(--green); }
.approval-btn--amber { border-color: rgba(156,122,60,.4); color: var(--amber); }
.approval-btn--amber:hover { background: var(--amber); color: var(--paper); border-color: var(--amber); }
.approval-btn--red { border-color: rgba(181,68,26,.3); color: #b5441a; }
.approval-btn--red:hover { background: #b5441a; color: var(--paper); border-color: #b5441a; }
.photo-error { font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; color: #b5441a; margin-bottom: 16px; padding: 10px 14px; background: rgba(181,68,26,.06); border: 1px solid rgba(181,68,26,.2); }
.lineage-hint { font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; color: var(--muted); text-align: right; max-width: 200px; line-height: 1.5; }

/* Archive empty state */
.archive-empty { padding: clamp(64px,10vh,120px) 0; text-align: center; border: 1px solid var(--line-2); }
.archive-empty-title { font-family: var(--f-serif); font-size: clamp(20px,2.5vw,28px); font-weight: 400; color: var(--ink); margin-bottom: 16px; }
.archive-empty-sub { font-family: var(--f-body); font-size: clamp(15px,1.3vw,18px); font-style: italic; color: var(--ink-2); max-width: 440px; margin: 0 auto; line-height: 1.6; }

/* Essay reader */
.reader-page { padding-top: var(--header-h); min-height: 100vh; }
.reader-loading { padding-top: var(--header-h); min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.reader-header { max-width: var(--max-w); margin: 0 auto; padding: 28px var(--gutter) 0; display: flex; align-items: center; border-bottom: 1px solid var(--line-2); padding-bottom: 20px; }
.reader-title-block { max-width: 760px; margin: 0 auto; padding: clamp(48px,8vh,96px) var(--gutter) clamp(40px,6vh,72px); }
.reader-genre { font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.reader-genre::before { content:""; display:block; width:20px; height:1px; background:var(--amber); }
.reader-title { font-family: var(--f-serif); font-size: clamp(36px,6vw,72px); font-weight: 400; line-height: 1.06; letter-spacing: -.01em; margin-bottom: 20px; }
.reader-byline { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 32px; }
.reader-statement { font-family: var(--f-body); font-size: clamp(17px,1.5vw,20px); font-style: italic; color: var(--ink-2); line-height: 1.7; padding-top: 28px; border-top: 1px solid var(--line-2); }
.reader-photos { display: flex; flex-direction: column; }
.reader-photo { border-top: 1px solid var(--line-2); }
.reader-photo-img-wrap { max-width: 100%; overflow: hidden; }
.reader-photo-img-wrap img { width: 100%; display: block; max-height: 92vh; object-fit: contain; background: var(--paper-2); }
.reader-caption { max-width: 760px; margin: 0 auto; padding: 16px var(--gutter) 32px; }
.reader-caption-meta { font-family: var(--f-mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px; }
.reader-caption-text { font-family: var(--f-body); font-size: 15px; font-style: italic; color: var(--ink-3); line-height: 1.6; }
.reader-bio-block { border-top: 1px solid var(--line-2); margin-top: 48px; padding: clamp(40px,6vh,72px) var(--gutter); }
.reader-bio-inner { max-width: 760px; margin: 0 auto; display: flex; gap: 24px; align-items: flex-start; }
.reader-bio-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--paper-3); border: 1px solid var(--line-2); display: flex; align-items: center; justify-content: center; font-family: var(--f-serif); font-size: 18px; font-weight: 700; color: var(--ink-3); flex-shrink: 0; }
.reader-bio-name { font-family: var(--f-serif); font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.reader-bio-text { font-family: var(--f-body); font-size: 16px; font-style: italic; color: var(--ink-3); line-height: 1.6; margin-bottom: 14px; }
.reader-bio-links { display: flex; gap: 20px; flex-wrap: wrap; align-items: center; }
.reader-bio-meta { font-family: var(--f-mono); font-size: 9px; letter-spacing: .12em; color: var(--muted); }
.card-img--empty { background: var(--paper-3); width: 100%; height: 100%; display: block; }
.single-essay-row { border: 1px solid var(--line-2); }

/* Caption editor */
.caption-editor { background: var(--paper-2); border: 1px solid var(--line-2); padding: 20px; margin-bottom: 20px; }
.photo-has-caption { position: absolute; bottom: 5px; right: 7px; color: var(--amber); font-size: 10px; }

/* Tab badge */
.tab-badge { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: var(--amber); color: var(--paper); font-size: 8px; font-family: var(--f-mono); margin-left: 6px; }

/* Editor review panel */
.review-panel { padding: 0; }
.review-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid var(--line-2); margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
.review-grid { display: grid; grid-template-columns: 1fr 260px; gap: clamp(32px,5vw,64px); align-items: start; }
.review-essay-title { font-family: var(--f-serif); font-size: clamp(24px,3vw,40px); font-weight: 400; margin-bottom: 8px; }
.review-essay-genre { font-family: var(--f-mono); font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--amber); margin-bottom: 32px; }
.review-section-head { font-family: var(--f-serif); font-size: 14px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-4); margin: 32px 0 16px; border-top: 1px solid var(--line-2); padding-top: 20px; }
.review-text { font-size: 17px; line-height: 1.7; color: var(--ink-2); }
.review-photos { display: flex; flex-direction: column; gap: 32px; }
.review-photo { display: grid; grid-template-columns: 1fr 200px; gap: 20px; align-items: start; border-bottom: 1px solid var(--line); padding-bottom: 24px; }
.review-photo-img-wrap { position: relative; overflow: hidden; aspect-ratio: 3/2; background: var(--paper-3); }
.review-photo-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.review-photo-meta { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
.review-photo-caption { font-family: var(--f-body); font-size: 14px; font-style: italic; color: var(--ink-3); text-transform: none; letter-spacing: 0; line-height: 1.5; margin-top: 4px; }
.review-aside { position: sticky; top: calc(var(--header-h) + 24px); }

@media (max-width: 900px) {
  .review-grid { grid-template-columns: 1fr; }
  .review-aside { position: static; }
  .review-photo { grid-template-columns: 1fr; }
}

/* Influence input */
.influence-input { position: relative; }
.influence-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.influence-tag { font-family: var(--f-mono); font-size: 9px; letter-spacing: .1em; background: var(--paper-3); border: 1px solid var(--line-2); padding: 4px 8px; display: flex; align-items: center; gap: 6px; color: var(--ink-3); }
.influence-tag button { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 13px; line-height: 1; padding: 0; transition: color .2s; }
.influence-tag button:hover { color: #b5441a; }
.influence-search-wrap { position: relative; }
.influence-search { width: 100%; background: var(--paper-2); border: 1px solid var(--line-2); padding: 11px 14px; font-family: var(--f-body); font-size: 16px; color: var(--ink); outline: none; transition: border-color .2s; }
.influence-search:focus { border-color: var(--amber); }
.influence-loading { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-family: var(--f-mono); font-size: 10px; color: var(--muted); }
.influence-dropdown { position: absolute; left: 0; right: 0; background: var(--paper); border: 1px solid var(--line-2); border-top: none; z-index: 100; max-height: 220px; overflow-y: auto; }
.influence-option { width: 100%; background: none; border: none; border-bottom: 1px solid var(--line); padding: 10px 14px; cursor: pointer; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; text-align: left; transition: background .15s; }
.influence-option:last-child { border-bottom: none; }
.influence-option:hover { background: var(--paper-2); }
.influence-option-name { font-family: var(--f-body); font-size: 16px; color: var(--ink); }
.influence-option-id { font-family: var(--f-mono); font-size: 9px; letter-spacing: .1em; color: var(--muted); }

/* Responsive */
@media (max-width: 960px) {
  .hero-inner { grid-template-columns: 1fr; }
  .hero-right { display: none; }
  .featured-row { grid-template-columns: 1fr; }
  .standard-row { grid-template-columns: 1fr 1fr; }
  .profile-hero-inner { grid-template-columns: auto 1fr; }
  .profile-lineage-link { display: none; }
  .static-body { grid-template-columns: 1fr; }
  .static-col--narrow { position: static; border-top: 1px solid var(--line-2); padding-top: 28px; }
  .aside-block:first-child { border-top: none; }
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .standard-row { grid-template-columns: 1fr; }
  .hero-stats-inner { grid-template-columns: 1fr 1fr; }
  .hero-stats-inner .stat-item:nth-child(3) { display: none; }
  .header-meta { display: none; }
  .essay-row { grid-template-columns: 56px 1fr auto; gap: 12px; }
  .footer-inner { flex-direction: column; align-items: flex-start; gap: 20px; }
  .footer-links { flex-wrap: wrap; gap: 16px; }
  .footer-copy { display: none; }
  .profile-hero-inner { grid-template-columns: 1fr; }
  .profile-hero-actions { flex-direction: row; align-items: center; }
}
`;

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1,viewport-fit=cover"
  >

  <meta name="theme-color" content="#0b0d10">

  <title>Business AI</title>

  <style>
    :root{
      --bg:#07090c;
      --card:#11161c;
      --card2:#0d1218;
      --line:#202832;
      --text:#f4f7fa;
      --muted:#8d98a5;
      --accent:#2878ff;
      --green:#36d399;
      --yellow:#f5c451;
      --red:#ff7272;
    }

    *{
      box-sizing:border-box
    }

    body{
      margin:0;
      background:var(--bg);
      color:var(--text);
      font-family:-apple-system,BlinkMacSystemFont,
        "SF Pro Display",Inter,Arial,sans-serif;
    }

    button,
    input,
    textarea,
    select{
      font:inherit;
    }

    button{
      cursor:pointer;
    }

    .app{
      max-width:540px;
      margin:auto;
      min-height:100vh;
      padding-bottom:90px;
    }

    header{
      padding:22px 20px 12px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      position:sticky;
      top:0;
      background:rgba(7,9,12,.92);
      backdrop-filter:blur(16px);
      z-index:4;
    }

    .brand{
      font-weight:800;
      font-size:22px;
      letter-spacing:-.5px;
    }

    .pill{
      font-size:12px;
      color:#bfeedd;
      background:rgba(54,211,153,.12);
      border:1px solid rgba(54,211,153,.25);
      padding:6px 9px;
      border-radius:999px;
    }

    main{
      padding:0 16px;
    }

    .hero{
      padding:18px 4px 8px;
    }

    .eyebrow{
      color:var(--muted);
      font-size:13px;
    }

    .hero h1{
      font-size:34px;
      line-height:1.05;
      margin:7px 0 8px;
      letter-spacing:-1.2px;
    }

    .hero p{
      color:var(--muted);
      margin:0;
      line-height:1.5;
    }

    .card{
      background:linear-gradient(180deg,var(--card),#0e1217);
      border:1px solid var(--line);
      border-radius:20px;
      padding:16px;
      margin-top:14px;
      box-shadow:0 8px 30px rgba(0,0,0,.18);
    }

    .card h2{
      font-size:16px;
      margin:0 0 12px;
    }

    .stats{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
    }

    .stat{
      background:var(--card2);
      border-radius:15px;
      padding:15px;
    }

    .stat b{
      font-size:26px;
    }

    .stat span{
      display:block;
      color:var(--muted);
      font-size:12px;
      margin-top:4px;
    }

    .primary{
      width:100%;
      border:0;
      background:var(--accent);
      color:white;
      padding:15px;
      border-radius:15px;
      font-weight:750;
      margin-top:12px;
    }

    .secondary{
      border:1px solid var(--line);
      background:var(--card2);
      color:var(--text);
      padding:11px 14px;
      border-radius:13px;
    }

    .chat{
      height:calc(100vh - 205px);
      min-height:500px;
      display:flex;
      flex-direction:column;
    }

    .messages{
      flex:1;
      overflow:auto;
      padding:4px 2px 12px;
    }

    .msg{
      max-width:88%;
      padding:12px 14px;
      border-radius:17px;
      margin:8px 0;
      line-height:1.42;
      font-size:15px;
      white-space:pre-wrap;
    }

    .ai{
      background:var(--card2);
      border:1px solid var(--line);
      border-bottom-left-radius:5px;
    }

    .user{
      background:var(--accent);
      margin-left:auto;
      border-bottom-right-radius:5px;
    }

    .composer{
      display:flex;
      gap:8px;
      border-top:1px solid var(--line);
      padding-top:10px;
    }

    .composer textarea{
      flex:1;
      resize:none;
      background:var(--card2);
      border:1px solid var(--line);
      color:var(--text);
      border-radius:15px;
      padding:12px;
      min-height:46px;
      max-height:120px;
      outline:none;
    }

    .send{
      width:48px;
      border:0;
      border-radius:15px;
      background:var(--accent);
      color:white;
      font-size:19px;
    }

    .hidden{
      display:none;
    }

    nav{
      position:fixed;
      bottom:0;
      left:0;
      right:0;
      z-index:5;
      max-width:540px;
      margin:auto;
      background:rgba(12,15,20,.94);
      backdrop-filter:blur(18px);
      border-top:1px solid var(--line);
      display:grid;
      grid-template-columns:repeat(4,1fr);
      padding:9px 8px calc(9px + env(safe-area-inset-bottom));
    }

    nav button{
      background:none;
      border:0;
      color:var(--muted);
      padding:8px 3px;
      font-size:11px;
    }

    nav button.active{
      color:white;
    }

    nav span{
      display:block;
      font-size:19px;
      margin-bottom:3px;
    }

    .dot{
      display:inline-block;
      width:8px;
      height:8px;
      border-radius:50%;
      background:var(--green);
      margin-right:6px;
    }

    .toolbar{
      display:flex;
      gap:8px;
      margin-top:14px;
    }

    .search{
      flex:1;
      background:var(--card2);
      border:1px solid var(--line);
      color:var(--text);
      border-radius:13px;
      padding:12px;
      outline:none;
      min-width:0;
    }

    .filter{
      background:var(--card2);
      border:1px solid var(--line);
      color:var(--text);
      border-radius:13px;
      padding:12px 8px;
      outline:none;
      max-width:125px;
    }

    .lead-card{
      background:linear-gradient(180deg,var(--card),#0e1217);
      border:1px solid var(--line);
      border-radius:18px;
      padding:15px;
      margin-top:12px;
    }

    .lead-top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .lead-name{
      font-weight:750;
      font-size:17px;
    }

    .badge{
      font-size:11px;
      padding:5px 8px;
      border-radius:999px;
      white-space:nowrap;
    }

    .badge-new{
      background:rgba(40,120,255,.13);
      color:#9fc2ff;
      border:1px solid rgba(40,120,255,.25);
    }

    .badge-contacted{
      background:rgba(245,196,81,.12);
      color:#f7d984;
      border:1px solid rgba(245,196,81,.25);
    }

    .badge-converted{
      background:rgba(54,211,153,.12);
      color:#bfeedd;
      border:1px solid rgba(54,211,153,.25);
    }

    .lead-meta{
      color:var(--muted);
      font-size:13px;
      line-height:1.55;
      margin-top:10px;
    }

    .lead-description{
      margin-top:10px;
      padding-top:10px;
      border-top:1px solid var(--line);
      color:#d8dee5;
      font-size:13px;
      line-height:1.5;
    }

    .status-row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-top:12px;
    }

    .status-select{
      background:var(--card2);
      border:1px solid var(--line);
      color:var(--text);
      border-radius:11px;
      padding:9px 10px;
      outline:none;
    }

    .urgency{
      font-size:11px;
      color:var(--muted);
    }

    .empty{
      color:var(--muted);
      text-align:center;
      padding:28px 12px;
    }

    .loading{
      text-align:center;
      color:var(--muted);
      padding:28px;
    }

    .error{
      color:#ffaaaa;
      background:rgba(255,90,90,.08);
      border:1px solid rgba(255,90,90,.2);
      padding:13px;
      border-radius:13px;
      margin-top:12px;
      font-size:13px;
    }

    .leads-header{
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-top:14px;
    }

    .refresh{
      border:1px solid var(--line);
      background:var(--card2);
      color:var(--text);
      padding:9px 11px;
      border-radius:11px;
      font-size:12px;
    }

    .section-title{
      font-weight:700;
      font-size:15px;
    }
  </style>
</head>

<body>

<div class="app">

  <header>
    <div class="brand">Business AI</div>

    <div class="pill">
      <span class="dot"></span>
      AI online
    </div>
  </header>

  <main>

    <!-- HOME -->

    <section id="home">

      <div class="hero">

        <div class="eyebrow">
          Your virtual front desk
        </div>

        <h1>
          Less admin.<br>
          More business.
        </h1>

        <p>
          Let AI handle first contact, qualify enquiries and prepare jobs for you.
        </p>

      </div>

      <div class="card">

        <h2>Today</h2>

        <div class="stats">

          <div class="stat">
            <b id="enquiries">0</b>
            <span>AI enquiries</span>
          </div>

          <div class="stat">
            <b id="qualified">0</b>
            <span>Qualified leads</span>
          </div>

        </div>

        <button
          class="primary"
          onclick="show('ai')"
        >
          Test your AI receptionist
        </button>

      </div>

      <div class="card">

        <h2>How the MVP works</h2>

        <p style="color:var(--muted);line-height:1.55;margin:0">
          Customer message → AI understands the job → asks the right questions
          → captures details → gives you a ready-to-action lead.
        </p>

      </div>

    </section>


    <!-- AI -->

    <section id="ai" class="hidden">

      <div class="hero">

        <div class="eyebrow">
          Live AI enquiry assistant
        </div>

        <h1 style="font-size:30px">
          Test a customer enquiry
        </h1>

        <p>
          The AI is connected to a secure server.
          Your API key is never placed in this webpage.
        </p>

      </div>

      <div class="card chat">

        <div id="messages" class="messages">

          <div class="msg ai">
            Hi, thanks for contacting North East Electrical.
            What can we help you with today?
          </div>

        </div>

        <div id="lead" class="lead"></div>

        <div class="composer">

          <textarea
            id="input"
            placeholder="Type a customer message..."
            rows="1"
          ></textarea>

          <button
            class="send"
            onclick="send()"
          >
            ➤
          </button>

        </div>

      </div>

    </section>


    <!-- LEADS -->

    <section id="leads" class="hidden">

      <div class="hero">

        <div class="eyebrow">
          Customer pipeline
        </div>

        <h1 style="font-size:30px">
          Leads
        </h1>

        <p>
          Every lead captured by your AI receptionist appears here.
        </p>

      </div>

      <div class="leads-header">

        <div>
          <div
            id="leadSummary"
            class="section-title"
          >
            0 leads
          </div>

          <div
            id="leadSubSummary"
            class="eyebrow"
          >
            Loading...
          </div>
        </div>

        <button
          class="refresh"
          onclick="loadLeads()"
        >
          ↻ Refresh
        </button>

      </div>

      <div class="toolbar">

        <input
          id="search"
          class="search"
          placeholder="Search leads..."
          oninput="renderLeads()"
        >

        <select
          id="filter"
          class="filter"
          onchange="renderLeads()"
        >
          <option value="All">All</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Converted">Converted</option>
        </select>

      </div>

      <div id="leadError"></div>

      <div id="leadsList">
        <div class="loading">
          Loading leads...
        </div>
      </div>

    </section>

  </main>


  <!-- NAVIGATION -->

  <nav>

    <button
      id="navhome"
      class="active"
      onclick="show('home')"
    >
      <span>⌂</span>
      Home
    </button>

    <button
      id="navai"
      onclick="show('ai')"
    >
      <span>✦</span>
      AI Enquiries
    </button>

    <button
      id="navleads"
      onclick="show('leads')"
    >
      <span>◉</span>
      Leads
    </button>

    <button
      id="navrules"
      onclick="alert('Business rules are the next module: service area, opening hours, job types and approval rules.')"
    >
      <span>⚙</span>
      Rules
    </button>

  </nav>

</div>


<script>

let history = [];

let enquiries = 0;

let leads = [];


const $ = id =>
  document.getElementById(id);


function show(id){

  ['home','ai','leads'].forEach(x => {

    $(x).classList.toggle(
      'hidden',
      x !== id
    );

  });


  $('navhome').classList.toggle(
    'active',
    id === 'home'
  );


  $('navai').classList.toggle(
    'active',
    id === 'ai'
  );


  $('navleads').classList.toggle(
    'active',
    id === 'leads'
  );


  if(id === 'leads'){
    loadLeads();
  }

}


function add(text, who){

  const d =
    document.createElement('div');

  d.className =
    'msg ' + who;

  d.textContent =
    text;

  $('messages').appendChild(d);

  $('messages').scrollTop =
    $('messages').scrollHeight;

}


function escapeHtml(value){

  return String(value ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );

}


function formatDate(value){

  if(!value)
    return '';

  const date =
    new Date(value);

  if(Number.isNaN(date.getTime()))
    return escapeHtml(value);

  return date.toLocaleString(
    'en-GB',
    {
      dateStyle:'medium',
      timeStyle:'short'
    }
  );

}


async function loadLeads(){

  $('leadError').innerHTML = '';

  $('leadsList').innerHTML =
    '<div class="loading">Loading leads...</div>';

  try{

    const res =
      await fetch('/api/leads', {
        method:'GET',
        headers:{
          'Accept':'application/json'
        }
      });


    const data =
      await res.json();


    if(!res.ok){

      throw new Error(
        data.error ||
        'Could not load leads'
      );

    }


    leads =
      Array.isArray(data)
        ? data
        : [];


    updateStats();

    renderLeads();

  }catch(error){

    console.error(error);

    $('leadsList').innerHTML = `
      <div class="card error">
        Could not load your leads.
        Please check the API deployment and try again.
      </div>
    `;

    $('leadError').innerHTML = `
      <div class="error">
        ${escapeHtml(error.message)}
      </div>
    `;

  }

}


function updateStats(){

  $('enquiries').textContent =
    enquiries;


  const qualified =
    leads.filter(
      lead => Boolean(lead.qualified)
    ).length;


  $('qualified').textContent =
    qualified;


  const total =
    leads.length;


  $('leadSummary').textContent =
    total === 1
      ? '1 lead'
      : `${total} leads`;


  const newCount =
    leads.filter(
      lead => (lead.status || 'New') === 'New'
    ).length;


  $('leadSubSummary').textContent =
    `${newCount} new`;
}


function renderLeads(){

  const list =
    $('leadsList');


  const search =
    $('search').value
      .trim()
      .toLowerCase();


  const filter =
    $('filter').value;


  const filtered =
    leads.filter(lead => {

      const status =
        lead.status || 'New';


      if(
        filter !== 'All' &&
        status !== filter
      ){
        return false;
      }


      if(!search)
        return true;


      const searchable = [

        lead.name,

        lead.phone,

        lead.email,

        lead.location,

        lead.job_type,

        lead.description,

        lead.urgency

      ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();


      return searchable.includes(search);

    });


  if(!filtered.length){

    list.innerHTML = `
      <div class="card empty">
        ${
          leads.length
            ? 'No leads match your search.'
            : 'No leads captured yet.'
        }
      </div>
    `;

    return;

  }


  list.innerHTML =
    filtered.map(lead => {

      const status =
        lead.status || 'New';


      const badgeClass =
        status === 'Converted'
          ? 'badge-converted'
          : status === 'Contacted'
            ? 'badge-contacted'
            : 'badge-new';


      return `

        <div class="lead-card">

          <div class="lead-top">

            <div class="lead-name">
              ${escapeHtml(
                lead.name || 'Unnamed lead'
              )}
            </div>

            <div class="badge ${badgeClass}">
              ${escapeHtml(status)}
            </div>

          </div>


          <div class="lead-meta">

            ${
              lead.phone
                ? `<strong>Phone:</strong>
                   ${escapeHtml(lead.phone)}<br>`
                : ''
            }

            ${
              lead.email
                ? `<strong>Email:</strong>
                   ${escapeHtml(lead.email)}<br>`
                : ''
            }

            ${
              lead.job_type
                ? `<strong>Job:</strong>
                   ${escapeHtml(lead.job_type)}<br>`
                : ''
            }

            ${
              lead.location
                ? `<strong>Location:</strong>
                   ${escapeHtml(lead.location)}<br>`
                : ''
            }

            ${
              lead.urgency
                ? `<strong>Urgency:</strong>
                   ${escapeHtml(lead.urgency)}<br>`
                : ''
            }

            ${
              lead.qualified
                ? `<strong>Qualified:</strong> Yes<br>`
                : ''
            }

            ${
              lead.created_at
                ? `<strong>Captured:</strong>
                   ${escapeHtml(
                     formatDate(lead.created_at)
                   )}`
                : ''
            }

          </div>


          ${
            lead.description
              ? `
                <div class="lead-description">
                  ${escapeHtml(
                    lead.description
                  )}
                </div>
              `
              : ''
          }


          <div class="status-row">

            <span class="urgency">
              Update pipeline status
            </span>

            <select
              class="status-select"
              onchange="updateLeadStatus(${Number(lead.id)}, this.value)"
            >

              <option
                value="New"
                ${status === 'New' ? 'selected' : ''}
              >
                New
              </option>

              <option
                value="Contacted"
                ${status === 'Contacted' ? 'selected' : ''}
              >
                Contacted
              </option>

              <option
                value="Converted"
                ${status === 'Converted' ? 'selected' : ''}
              >
                Converted
              </option>

            </select>

          </div>

        </div>

      `;

    }).join('');

}


async function updateLeadStatus(id, status){

  try{

    const res =
      await fetch('/api/leads', {

        method:'PATCH',

        headers:{
          'Content-Type':
            'application/json',

          'Accept':
            'application/json'
        },

        body:JSON.stringify({
          id,
          status
        })

      });


    const data =
      await res.json();


    if(!res.ok){

      throw new Error(
        data.error ||
        'Could not update lead'
      );

    }


    const index =
      leads.findIndex(
        lead => Number(lead.id) === Number(id)
      );


    if(index !== -1){

      leads[index] =
        data || {
          ...leads[index],
          status
        };

    }


    updateStats();

    renderLeads();

  }catch(error){

    console.error(error);

    alert(
      'Could not update the lead status. Please try again.'
    );

    loadLeads();

  }

}


async function send(){

  const input =
    $('input');

  const message =
    input.value.trim();


  if(!message)
    return;


  input.value = '';


  add(
    message,
    'user'
  );


  enquiries++;

  $('enquiries').textContent =
    enquiries;


  const thinking =
    document.createElement('div');


  thinking.className =
    'msg ai';


  thinking.textContent =
    'Thinking…';


  $('messages')
    .appendChild(thinking);


  try{

    const res =
      await fetch(
        '/api/enquiry',
        {
          method:'POST',

          headers:{
            'Content-Type':
              'application/json'
          },

          body:JSON.stringify({
            message,
            history
          })
        }
      );


    const data =
      await res.json();


    thinking.remove();


    if(!res.ok)
      throw new Error(
        data.error ||
        'Request failed'
      );


    add(
      data.reply,
      'ai'
    );


    history.push(

      {
        role:'user',
        content:message
      },

      {
        role:'assistant',
        content:data.reply
      }

    );


    if(
      data.lead &&
      data.lead.name &&
      (
        data.lead.phone ||
        data.lead.email
      )
    ){

      $('lead').innerHTML =
        '<strong>Lead captured</strong> · ' +
        [
          data.lead.name,
          data.lead.phone,
          data.lead.job_type,
          data.lead.location
        ]
        .filter(Boolean)
        .join(' · ');


      // Refresh from Supabase so the
      // dashboard uses the real database.

      await loadLeads();

    }


  }catch(error){

    thinking.remove();

    add(
      'Sorry, I could not connect to the AI service. Check that the server is deployed and configured correctly.',
      'ai'
    );

    console.error(error);

  }

}


$('input').addEventListener(
  'keydown',
  e => {

    if(
      e.key === 'Enter' &&
      !e.shiftKey
    ){

      e.preventDefault();

      send();

    }

  }
);


loadLeads();

</script>

</body>
</html>

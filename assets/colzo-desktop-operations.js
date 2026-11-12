/* Authenticated owner desktop overview only. Reads supplied workspace records.
   No network calls, AI generation, cross-tenant access, or record mutations. */
(function (global) {
  'use strict';

  const fallbackZone = 'Europe/London';
  const allowedRoutes = new Set(['leads', 'bookings', 'actions']);

  function timezone(value) {
    if (typeof value !== 'string' || !value || value.length > 64) return fallbackZone;
    try {
      new Intl.DateTimeFormat('en-GB', {timeZone:value});
      return value;
    } catch {
      return fallbackZone;
    }
  }

  function localDateParts(value, zone) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hourCycle:'h23'
    });
    const data = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
    if (!data.year || !data.month || !data.day) return null;
    return {
      day: data.year + '-' + data.month + '-' + data.day,
      time: data.hour + ':' + data.minute,
      timestamp: date.getTime()
    };
  }

  // DATE-only task deadlines denote a local calendar day, not UTC midnight.
  // UTC parsing otherwise shifts dates backwards in western timezones.
  function actionDueDate(value, zone) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const timestamp = Date.parse(value);
      if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10) !== value) return null;
      return {day:value,timestamp};
    }
    return localDateParts(value, zone);
  }

  function attention(records, options = {}) {
    const zone = timezone(options.timezone);
    const today = localDateParts(options.now === undefined ? new Date() : options.now, zone)?.day;
    if (!today) return [];
    const items = [];
    const actions = Array.isArray(records?.actions) ? records.actions : [];
    const bookings = Array.isArray(records?.bookings) ? records.bookings : [];
    const leads = Array.isArray(records?.leads) ? records.leads : [];

    for (const action of actions) {
      if (!action || action.status !== 'pending') continue;
      const due = action.due_at ? actionDueDate(action.due_at, zone) : null;
      if (!due || due.day > today) continue;
      const overdue = due.day < today;
      items.push({
        title: String(action.title || 'Action due'),
        meta: overdue ? 'Overdue action' : 'Due today',
        route: 'actions',
        rank: overdue ? 0 : 2,
        time: due.timestamp
      });
    }
    for (const booking of bookings) {
      if (booking?.status !== 'requested') continue;
      items.push({
        title: String(booking.title || 'Booking request'),
        meta: 'Awaiting confirmation',
        route: 'bookings',
        rank: 1,
        time: 0
      });
    }
    for (const lead of leads) {
      const status = String(lead?.status || 'New').trim().toLowerCase();
      if (!lead || /won|completed|converted|closed|resolved/.test(status) ||
          !/new|pending|unread|open/.test(status)) continue;
      items.push({
        title: String(lead.name || lead.job_type || 'New enquiry'),
        meta: 'New enquiry',
        route: 'leads',
        rank: 3,
        time: 0
      });
    }

    return items.sort((a,b) => a.rank - b.rank || a.time - b.time)
      .map(({title,meta,route}) => ({title,meta,route}));
  }

  function schedule(bookings, options = {}) {
    const zone = timezone(options.timezone);
    const today = localDateParts(options.now === undefined ? new Date() : options.now, zone)?.day;
    if (!today) return [];
    const items = [];
    for (const booking of (Array.isArray(bookings) ? bookings : [])) {
      if (!booking || booking.status !== 'confirmed' || !booking.starts_at) continue;
      const when = localDateParts(booking.starts_at, zone);
      if (!when || when.day !== today) continue;
      items.push({
        title: String(booking.title || 'Appointment'),
        meta: String(booking.customer_name || 'Confirmed booking'),
        route: 'bookings',
        time: when.time,
        timestamp: when.timestamp
      });
    }
    return items.sort((a,b) => a.timestamp - b.timestamp)
      .map(({title,meta,route,time}) => ({title,meta,route,time}));
  }

  function showItems(document, container, records, emptyText, navigate) {
    if (!container) return;
    container.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('p');
      empty.className = 'colzo-ops-empty';
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }
    for (const item of records.slice(0,4)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'colzo-ops-row';
      const badge = document.createElement('span');
      badge.className = 'colzo-ops-mark';
      badge.setAttribute('aria-hidden','true');
      badge.textContent = item.time || '•';

      const text = document.createElement('span');
      text.className = 'colzo-ops-row-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const sub = document.createElement('small');
      sub.textContent = item.meta;
      text.append(title,sub);

      const chevron = document.createElement('span');
      chevron.className = 'colzo-ops-arrow';
      chevron.setAttribute('aria-hidden','true');
      chevron.textContent = '›';

      button.append(badge,text,chevron);
      if (allowedRoutes.has(item.route)) {
        button.addEventListener('click', () => {
          if (typeof navigate === 'function') navigate(item.route);
        });
      } else {
        button.disabled = true;
      }
      container.append(button);
    }
  }

  function dateLabel(options = {}) {
    const zone = timezone(options.timezone);
    const date = new Date(options.now === undefined ? new Date() : options.now);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone:zone,weekday:'short',day:'numeric',month:'short'
    }).format(date);
  }

  function dueCount(actions, options = {}) {
    return attention({actions}, options).filter(item => item.route === 'actions').length;
  }

  function render(document, {leads=[],actions=[],bookings=[],now=new Date(),timezone:zone,navigate} = {}) {
    if (!document?.getElementById) return;
    const attentionItems = attention({leads,actions,bookings},{now,timezone:zone});
    const scheduleItems = schedule(bookings,{now,timezone:zone});
    showItems(document,document.getElementById('colzoAttentionList'),attentionItems,
      'No items currently need attention.',navigate);
    showItems(document,document.getElementById('colzoScheduleList'),scheduleItems,
      'No confirmed appointments today.',navigate);
    const attentionCount = document.getElementById('colzoAttentionCount');
    const scheduleCount = document.getElementById('colzoScheduleCount');
    if (attentionCount) attentionCount.textContent = attentionItems.length > 4 ?
      'Showing 4 of ' + attentionItems.length : attentionItems.length + ' items';
    if (scheduleCount) scheduleCount.textContent = scheduleItems.length > 4 ?
      'Showing 4 of ' + scheduleItems.length : scheduleItems.length + ' confirmed';
  }

  global.ColzoDesktopOperations = {attention,schedule,dueCount,dateLabel,render};
})(typeof window === 'undefined' ? {} : window);

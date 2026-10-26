-- Synthetic transaction fixture only. No real Auth users or source-data records.

 CREATE TABLE businesses(id uuid PRIMARY KEY);
 CREATE TABLE leads(id bigint PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses,UNIQUE(id,business_id));
 CREATE TABLE colzo_pilot_access(business_id uuid PRIMARY KEY REFERENCES businesses,status text,activated_at timestamptz,expires_at timestamptz);
 CREATE TABLE bookings(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL REFERENCES businesses,lead_id bigint,title text NOT NULL,customer_name text NOT NULL DEFAULT '',customer_phone text NOT NULL DEFAULT '',customer_email text NOT NULL DEFAULT '',location text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',status text NOT NULL,source text NOT NULL,FOREIGN KEY(lead_id,business_id) REFERENCES leads(id,business_id));
 CREATE TABLE lead_history(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,lead_id bigint NOT NULL,action text NOT NULL,old_value text,new_value text);
 CREATE TABLE business_audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid NOT NULL,action text NOT NULL,resource_type text NOT NULL,resource_id text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}');
 ALTER TABLE bookings ENABLE ROW LEVEL SECURITY; ALTER TABLE colzo_pilot_access ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON bookings,colzo_pilot_access FROM PUBLIC,anon,authenticated;GRANT SELECT ON colzo_pilot_access TO service_role;
 INSERT INTO businesses VALUES('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');INSERT INTO leads VALUES(1,'10000000-0000-4000-8000-000000000001'),(2,'10000000-0000-4000-8000-000000000002');
 INSERT INTO colzo_pilot_access VALUES('10000000-0000-4000-8000-000000000001','active',now()-interval '1 day',now()+interval '13 days'),('10000000-0000-4000-8000-000000000002','active',now()-interval '1 day',now()+interval '13 days');

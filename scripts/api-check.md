# CorpERP API Verification Checks

All commands assume CorpERP server is running at `http://localhost:3000`.

---

### Check 1: Login as Employee and Verify Identity
```bash
# 1.1 Login as Employee
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@corperp.com","password":"Password@123"}' \
  -c cookies.txt
# Expected: 200 OK with session object, sets corperp_token cookie

# 1.2 Verify session identity
curl -i -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt
# Expected: 200 OK with role: "EMPLOYEE", name: "Sneha Iyer"
```

---

### Check 2: Role Access Enforcement
```bash
# 2.1 Employee attempting to list all employees
curl -i -X GET "http://localhost:3000/api/employees" \
  -b cookies.txt
# Expected: 403 Forbidden with {"error":{"message":"You do not have permission to perform this action"}}
```

---

### Check 3: Attendance Check-in and Check-out Cycle
```bash
# 3.1 Initial Check-in
curl -i -X POST http://localhost:3000/api/attendance/check-in \
  -b cookies.txt
# Expected: 201 Created with AttendanceRecordDto, status: "PRESENT", workedMinutes: 0

# 3.2 Duplicate Check-in
curl -i -X POST http://localhost:3000/api/attendance/check-in \
  -b cookies.txt
# Expected: 409 Conflict with {"error":{"message":"Already checked in today"}}

# 3.3 Check-out
curl -i -X POST http://localhost:3000/api/attendance/check-out \
  -b cookies.txt
# Expected: 200 OK with AttendanceRecordDto, checkOut set, workedMinutes >= 0
```

---

### Check 4: Leave Application & Overlap Validation
```bash
# 4.1 Apply for Casual Leave (2 future weekdays)
# Find leaveTypeId for Casual Leave
curl -s http://localhost:3000/api/leave-types -b cookies.txt
# Note Casual Leave id as $CASUAL_ID

curl -i -X POST http://localhost:3000/api/leave-requests \
  -H "Content-Type: application/json" \
  -d '{"leaveTypeId":"<CASUAL_ID>","startDate":"2026-11-09","endDate":"2026-11-10","reason":"Personal work"}' \
  -b cookies.txt
# Expected: 201 Created with status: "PENDING", days: 2

# 4.2 Overlapping Leave Application
curl -i -X POST http://localhost:3000/api/leave-requests \
  -H "Content-Type: application/json" \
  -d '{"leaveTypeId":"<CASUAL_ID>","startDate":"2026-11-10","endDate":"2026-11-11","reason":"Overlapping request"}' \
  -b cookies.txt
# Expected: 409 Conflict with {"error":{"message":"You already have a pending or approved leave overlapping these dates"}}
```

---

### Check 5: Manager Leave Review & Balance Deduction
```bash
# 5.1 Login as Manager
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@corperp.com","password":"Password@123"}' \
  -c cookies_mgr.txt

# 5.2 List approvals (shows requests of direct reports: Sneha & Kabir)
curl -i -X GET "http://localhost:3000/api/leave-requests?scope=approvals" \
  -b cookies_mgr.txt
# Expected: 200 OK with list of pending requests

# 5.3 Approve Sneha's request
curl -i -X PATCH "http://localhost:3000/api/leave-requests/<REQUEST_ID>/decision" \
  -H "Content-Type: application/json" \
  -d '{"decision":"APPROVED","comment":"Approved by manager"}' \
  -b cookies_mgr.txt
# Expected: 200 OK with status: "APPROVED"

# 5.4 Check Sneha's leave balance (used incremented by 2)
curl -i -X GET "http://localhost:3000/api/leave-balances?employeeId=<SNEHA_EMP_ID>" \
  -b cookies_mgr.txt
# Expected: 200 OK with Casual Leave used increased by 2, remaining decreased by 2
```

---

### Check 6: Manager Reviewing Non-Report Request
```bash
# 6.1 Manager attempting to decide request of an employee not reporting to him (e.g. Arjun Patel)
curl -i -X PATCH "http://localhost:3000/api/leave-requests/<ARJUN_REQUEST_ID>/decision" \
  -H "Content-Type: application/json" \
  -d '{"decision":"APPROVED"}' \
  -b cookies_mgr.txt
# Expected: 403 Forbidden with {"error":{"message":"You are not allowed to review this request"}}
```

---

### Check 7: Payroll Generation & Verification
```bash
# 7.1 Login as HR
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@corperp.com","password":"Password@123"}' \
  -c cookies_hr.txt

# 7.2 Generate payroll for previous month (e.g. month: 9, year: 2026)
curl -i -X POST http://localhost:3000/api/payroll/runs \
  -H "Content-Type: application/json" \
  -d '{"month":9,"year":2026}' \
  -b cookies_hr.txt
# Expected: 201 Created with PayrollRunDto

# 7.3 Duplicate payroll generation
curl -i -X POST http://localhost:3000/api/payroll/runs \
  -H "Content-Type: application/json" \
  -d '{"month":9,"year":2026}' \
  -b cookies_hr.txt
# Expected: 409 Conflict with {"error":{"message":"Payroll already generated for this month"}}

# 7.4 Inspect generated payroll run details and payslips
curl -i -X GET "http://localhost:3000/api/payroll/runs/<RUN_ID>" \
  -b cookies_hr.txt
# Expected: 200 OK with 12 payslips; Sneha's payslip has gross = 90000, pfDeduction = 7200, taxDeduction = 4500
```

---

### Check 8: Delete Payroll Run Role Restriction
```bash
# 8.1 HR attempts to delete payroll run
curl -i -X DELETE "http://localhost:3000/api/payroll/runs/<RUN_ID>" \
  -b cookies_hr.txt
# Expected: 403 Forbidden

# 8.2 Login as Admin
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corperp.com","password":"Password@123"}' \
  -c cookies_admin.txt

# 8.3 Admin deletes payroll run
curl -i -X DELETE "http://localhost:3000/api/payroll/runs/<RUN_ID>" \
  -b cookies_admin.txt
# Expected: 200 OK with {"data":{"ok":true}}
```

---

### Check 9: Employee Creation Permissions & Initial Login
```bash
# 9.1 HR attempts to create employee with role ADMIN
curl -i -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Admin","email":"newadmin@corperp.com","designation":"Lead","departmentId":"<DEPT_ID>","joinDate":"2025-01-06","role":"ADMIN","basic":80000,"hra":32000,"allowances":8000,"pfPercent":12,"taxPercent":5}' \
  -b cookies_hr.txt
# Expected: 403 Forbidden with {"error":{"message":"Only an admin can assign or change the admin role"}}

# 9.2 HR creates employee with role EMPLOYEE
curl -i -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"firstName":"New","lastName":"Staff","email":"newstaff@corperp.com","designation":"Associate","departmentId":"<DEPT_ID>","joinDate":"2025-01-06","role":"EMPLOYEE","basic":40000,"hra":16000,"allowances":4000,"pfPercent":12,"taxPercent":5}' \
  -b cookies_hr.txt
# Expected: 201 Created with EmployeeDetail

# 9.3 New employee logs in with default password Welcome@123
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newstaff@corperp.com","password":"Welcome@123"}' \
  -c cookies_new.txt
# Expected: 200 OK with SessionUser
```

---

### Check 10: Dashboard Endpoint by Role
```bash
# 10.1 Admin / HR Dashboard
curl -s http://localhost:3000/api/dashboard -b cookies_admin.txt
# Expected: {"data":{"view":"ADMIN_HR", ...}}

# 10.2 Manager Dashboard
curl -s http://localhost:3000/api/dashboard -b cookies_mgr.txt
# Expected: {"data":{"view":"MANAGER", ...}}

# 10.3 Employee Dashboard
curl -s http://localhost:3000/api/dashboard -b cookies.txt
# Expected: {"data":{"view":"EMPLOYEE", ...}}
```

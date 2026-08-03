import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = roles?.some((r: unknown) =>
    ["admin", "super_admin"].includes(r.role)
  );
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action } = await req.json();

  if (action === "run") {
    try {
      const report = await runStressTest(supabase, user.id);
      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      return new Response(
        JSON.stringify({ error: err.message, stack: err.stack }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  if (action === "cleanup") {
    try {
      await cleanupSimulation(supabase);
      return new Response(
        JSON.stringify({ success: true, message: "Simulation data cleaned" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (err: unknown) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAccountNumber() {
  return "SIM" + String(Math.floor(Math.random() * 10000000)).padStart(7, "0");
}

async function runStressTest(supabase: unknown, adminId: string) {
  const startTime = Date.now();
  const report: unknown = {
    simulated_users: 0,
    accounts_created: 0,
    transactions_executed: 0,
    transactions_failed: 0,
    fraud_alerts_triggered: 0,
    loans_applied: 0,
    loans_approved: 0,
    loans_rejected: 0,
    loan_repayments: 0,
    referral_rewards_issued: 0,
    cashback_rewards_issued: 0,
    balance_mismatches: 0,
    transfer_limit_rejections: 0,
    suspended_account_rejections: 0,
    concurrent_transfer_results: { success: 0, failed: 0 },
    performance: {
      avg_transaction_ms: 0,
      total_duration_ms: 0,
    },
    errors: [] as string[],
    steps_completed: [] as string[],
  };

  const txTimes: number[] = [];

  // ── Step 1: Create simulated users & accounts ──
  const simUserIds: string[] = [];
  const simAccountIds: string[] = [];

  // Get savings account type ID
  const { data: accountType } = await supabase
    .from("account_types")
    .select("id")
    .eq("name", "Savings Account")
    .single();

  const accountTypeId = accountType?.id;

  for (let i = 0; i < 50; i++) {
    const userId = crypto.randomUUID();
    const balance = randomBetween(500, 10000);
    const acctNum = generateAccountNumber();

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      full_name: `SIM-User-${i + 1}`,
      email: `sim-user-${i + 1}@simulation.test`,
      kyc_status: "approved",
    });

    if (profileErr) {
      report.errors.push(`Profile create #${i}: ${profileErr.message}`);
      continue;
    }

    const { data: acct, error: acctErr } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        account_number: acctNum,
        account_type: "savings",
        account_type_id: accountTypeId,
        balance: balance,
        available_balance: balance,
        ledger_balance: 0,
        status: "active",
      })
      .select("id")
      .single();

    if (acctErr) {
      report.errors.push(`Account create #${i}: ${acctErr.message}`);
      continue;
    }

    simUserIds.push(userId);
    simAccountIds.push(acct.id);
    report.simulated_users++;
    report.accounts_created++;
  }
  report.steps_completed.push("Step 1: Created 50 simulated users & accounts");

  if (simAccountIds.length < 2) {
    report.errors.push("Not enough accounts created to continue");
    report.performance.total_duration_ms = Date.now() - startTime;
    return report;
  }

  // ── Step 2: Generate transaction load (500 transactions) ──
  const txTypes = ["transfer", "deposit", "withdrawal"];
  for (let i = 0; i < 500; i++) {
    const fromIdx = randomBetween(0, simAccountIds.length - 1);
    let toIdx = randomBetween(0, simAccountIds.length - 1);
    while (toIdx === fromIdx) {
      toIdx = randomBetween(0, simAccountIds.length - 1);
    }
    const amount = randomBetween(1, 50);
    const txType = txTypes[i % txTypes.length];

    const txStart = Date.now();
    const { error } = await supabase.rpc("execute_transaction", {
      p_debit_account: simAccountIds[fromIdx],
      p_credit_account: simAccountIds[toIdx],
      p_amount: amount,
      p_transaction_type: txType,
      p_description: `SIM-TX-${txType}-${i}`,
      p_user_id: simUserIds[fromIdx],
    });
    txTimes.push(Date.now() - txStart);

    if (error) {
      report.transactions_failed++;
    } else {
      report.transactions_executed++;
    }
  }
  report.steps_completed.push(
    "Step 2: Executed 500 transactions across simulated accounts"
  );

  // ── Step 3: Concurrent transfers (50 simultaneous) ──
  const concurrentPromises = [];
  for (let i = 0; i < 50; i++) {
    const fromIdx = randomBetween(0, simAccountIds.length - 1);
    let toIdx = randomBetween(0, simAccountIds.length - 1);
    while (toIdx === fromIdx) {
      toIdx = randomBetween(0, simAccountIds.length - 1);
    }
    concurrentPromises.push(
      supabase.rpc("execute_transaction", {
        p_debit_account: simAccountIds[fromIdx],
        p_credit_account: simAccountIds[toIdx],
        p_amount: randomBetween(1, 20),
        p_transaction_type: "transfer",
        p_description: `SIM-CONCURRENT-${i}`,
        p_user_id: simUserIds[fromIdx],
      })
    );
  }
  const concurrentResults = await Promise.all(concurrentPromises);
  for (const r of concurrentResults) {
    if (r.error) {
      report.concurrent_transfer_results.failed++;
    } else {
      report.concurrent_transfer_results.success++;
      report.transactions_executed++;
    }
  }
  report.steps_completed.push(
    "Step 3: Tested 50 concurrent transfers"
  );

  // ── Step 4: Fraud detection (large transactions) ──
  for (let i = 0; i < 5; i++) {
    const fromIdx = 0;
    const toIdx = 1;
    // Top up account first to have enough balance
    await supabase
      .from("accounts")
      .update({ available_balance: 50000, balance: 50000 })
      .eq("id", simAccountIds[fromIdx]);

    await supabase.rpc("execute_transaction", {
      p_debit_account: simAccountIds[fromIdx],
      p_credit_account: simAccountIds[toIdx],
      p_amount: 15000,
      p_transaction_type: "transfer",
      p_description: `SIM-FRAUD-LARGE-${i}`,
      p_user_id: simUserIds[fromIdx],
    });
  }

  // Count fraud alerts for sim users
  const { count: fraudCount } = await supabase
    .from("fraud_alerts")
    .select("*", { count: "exact", head: true })
    .in("user_id", simUserIds);
  report.fraud_alerts_triggered = fraudCount || 0;
  report.steps_completed.push(
    "Step 4: Fraud detection tested - triggered " + report.fraud_alerts_triggered + " alerts"
  );

  // ── Step 5: Transfer limits ──
  // Set a low limit on one account and try to exceed it
  const limitAcctId = simAccountIds[2];
  await supabase
    .from("transfer_limits")
    .upsert({
      account_id: limitAcctId,
      daily_limit: 10,
      per_transaction_limit: 5,
      currency: "USD",
    });
  // Top up
  await supabase
    .from("accounts")
    .update({ available_balance: 10000, balance: 10000 })
    .eq("id", limitAcctId);

  const { error: limitErr } = await supabase.rpc(
    "transfer_between_accounts",
    {
      p_from_account: limitAcctId,
      p_to_account: simAccountIds[3],
      p_amount: 100,
      p_user_id: simUserIds[2],
    }
  );
  if (limitErr) {
    report.transfer_limit_rejections++;
    report.steps_completed.push("Step 5: Transfer limit rejection confirmed");
  } else {
    report.errors.push("Transfer limit was NOT enforced");
    report.steps_completed.push(
      "Step 5: FAILED - Transfer limit not enforced"
    );
  }

  // ── Step 6: Account suspension ──
  const suspendedIndices = [];
  for (let i = 5; i < 10 && i < simAccountIds.length; i++) {
    suspendedIndices.push(i);
    await supabase
      .from("accounts")
      .update({ status: "suspended" })
      .eq("id", simAccountIds[i]);
  }

  for (const idx of suspendedIndices) {
    const toIdx = idx === 0 ? 1 : 0;
    const { error: suspErr } = await supabase.rpc("execute_transaction", {
      p_debit_account: simAccountIds[idx],
      p_credit_account: simAccountIds[toIdx],
      p_amount: 1,
      p_transaction_type: "transfer",
      p_description: "SIM-SUSPENDED-TEST",
      p_user_id: simUserIds[idx],
    });
    if (suspErr) {
      report.suspended_account_rejections++;
    }
  }
  // Restore
  for (const idx of suspendedIndices) {
    await supabase
      .from("accounts")
      .update({ status: "active" })
      .eq("id", simAccountIds[idx]);
  }
  report.steps_completed.push(
    `Step 6: Suspended account rejections: ${report.suspended_account_rejections}/${suspendedIndices.length}`
  );

  // ── Step 7: Loan flows ──
  const { data: loanProduct } = await supabase
    .from("loan_products")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (loanProduct) {
    const loanIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const userIdx = i % simUserIds.length;
      const principal = randomBetween(
        loanProduct.min_amount,
        Math.min(loanProduct.max_amount, 5000)
      );
      const rate = loanProduct.interest_rate;
      const months = loanProduct.term_months;
      const monthlyRate = rate / 100 / 12;
      const monthlyPayment =
        monthlyRate > 0
          ? Math.round(
              (principal * monthlyRate) /
                (1 - Math.pow(1 + monthlyRate, -months)) *
                100
            ) / 100
          : Math.round((principal / months) * 100) / 100;
      const totalPayable = Math.round(monthlyPayment * months * 100) / 100;

      const { data: loan, error: loanErr } = await supabase
        .from("loans")
        .insert({
          user_id: simUserIds[userIdx],
          product_id: loanProduct.id,
          principal,
          interest_rate: rate,
          term_months: months,
          monthly_payment: monthlyPayment,
          total_payable: totalPayable,
          disbursement_account_id: simAccountIds[userIdx],
          status: "pending",
        })
        .select("id")
        .single();

      if (!loanErr && loan) {
        loanIds.push(loan.id);
        report.loans_applied++;
      }
    }

    // Approve half, reject half
    for (let i = 0; i < loanIds.length; i++) {
      if (i < loanIds.length / 2) {
        const { error } = await supabase.rpc("approve_loan", {
          p_loan_id: loanIds[i],
          p_admin_id: adminId,
        });
        if (!error) report.loans_approved++;
        else report.errors.push(`Loan approve: ${error.message}`);
      } else {
        const { error } = await supabase.rpc("reject_loan", {
          p_loan_id: loanIds[i],
          p_admin_id: adminId,
          p_reason: "SIM-Rejection test",
        });
        if (!error) report.loans_rejected++;
      }
    }

    // Attempt one loan repayment
    if (report.loans_approved > 0) {
      const { data: repayment } = await supabase
        .from("loan_repayments")
        .select("id, loan_id")
        .eq("status", "pending")
        .limit(1)
        .single();

      if (repayment) {
        const { data: loan } = await supabase
          .from("loans")
          .select("user_id")
          .eq("id", repayment.loan_id)
          .single();

        if (loan) {
          const { error: repayErr } = await supabase.rpc(
            "make_loan_repayment",
            {
              p_repayment_id: repayment.id,
              p_user_id: loan.user_id,
            }
          );
          if (!repayErr) report.loan_repayments++;
          else
            report.errors.push(`Loan repayment: ${repayErr.message}`);
        }
      }
    }
  } else {
    report.errors.push("No active loan product found - skipping loan tests");
  }
  report.steps_completed.push(
    `Step 7: Loans - applied:${report.loans_applied} approved:${report.loans_approved} rejected:${report.loans_rejected} repaid:${report.loan_repayments}`
  );

  // ── Step 8: Cashback check ──
  const { count: cashbackCount } = await supabase
    .from("cashback_rewards")
    .select("*", { count: "exact", head: true })
    .in("user_id", simUserIds);
  report.cashback_rewards_issued = cashbackCount || 0;
  report.steps_completed.push(
    `Step 8: Cashback rewards generated: ${report.cashback_rewards_issued}`
  );

  // ── Step 9: Balance integrity check ──
  for (const acctId of simAccountIds.slice(0, 10)) {
    const { data: acct } = await supabase
      .from("accounts")
      .select("available_balance, balance, ledger_balance")
      .eq("id", acctId)
      .single();

    const { data: debits } = await supabase
      .from("ledger_entries")
      .select("amount")
      .eq("debit_account_id", acctId);

    const { data: credits } = await supabase
      .from("ledger_entries")
      .select("amount")
      .eq("credit_account_id", acctId);

    if (acct && debits && credits) {
      const totalDebits = debits.reduce(
        (sum: number, d: unknown) => sum + Number(d.amount),
        0
      );
      const totalCredits = credits.reduce(
        (sum: number, c: unknown) => sum + Number(c.amount),
        0
      );
      const expectedLedger = totalDebits - totalCredits;
      if (Math.abs(acct.ledger_balance - expectedLedger) > 0.01) {
        report.balance_mismatches++;
      }
    }
  }
  report.steps_completed.push(
    `Step 9: Balance integrity check - mismatches: ${report.balance_mismatches}`
  );

  // ── Performance metrics ──
  if (txTimes.length > 0) {
    report.performance.avg_transaction_ms =
      Math.round(txTimes.reduce((a, b) => a + b, 0) / txTimes.length);
  }
  report.performance.total_duration_ms = Date.now() - startTime;

  // Audit log
  await supabase.from("audit_logs").insert({
    action: "admin.stress_test",
    user_id: adminId,
    metadata: report,
  });

  return report;
}

async function cleanupSimulation(supabase: unknown) {
  // Delete sim profiles (cascades will handle related data)
  // First get sim user IDs
  const { data: simProfiles } = await supabase
    .from("profiles")
    .select("id")
    .like("full_name", "SIM-%");

  if (!simProfiles || simProfiles.length === 0) return;

  const simUserIds = simProfiles.map((p: unknown) => p.id);

  // Delete in order to respect foreign keys
  await supabase
    .from("notifications")
    .delete()
    .in("user_id", simUserIds);

  await supabase
    .from("fraud_alerts")
    .delete()
    .in("user_id", simUserIds);

  await supabase
    .from("cashback_rewards")
    .delete()
    .in("user_id", simUserIds);

  // Get loan IDs
  const { data: simLoans } = await supabase
    .from("loans")
    .select("id")
    .in("user_id", simUserIds);

  if (simLoans && simLoans.length > 0) {
    const loanIds = simLoans.map((l: unknown) => l.id);
    await supabase
      .from("loan_repayments")
      .delete()
      .in("loan_id", loanIds);
    await supabase.from("loans").delete().in("user_id", simUserIds);
  }

  // Get sim account IDs
  const { data: simAccounts } = await supabase
    .from("accounts")
    .select("id")
    .in("user_id", simUserIds);

  if (simAccounts && simAccounts.length > 0) {
    const acctIds = simAccounts.map((a: unknown) => a.id);

    await supabase
      .from("ledger_entries")
      .delete()
      .or(
        acctIds
          .map(
            (id: string) =>
              `debit_account_id.eq.${id},credit_account_id.eq.${id}`
          )
          .join(",")
      );

    await supabase
      .from("transactions")
      .delete()
      .in("account_id", acctIds);

    await supabase
      .from("transfer_limits")
      .delete()
      .in("account_id", acctIds);

    await supabase
      .from("beneficiaries")
      .delete()
      .in("user_id", simUserIds);

    await supabase.from("accounts").delete().in("user_id", simUserIds);
  }

  await supabase.from("referrals").delete().in("referrer_user_id", simUserIds);
  await supabase.from("profiles").delete().in("id", simUserIds);
}

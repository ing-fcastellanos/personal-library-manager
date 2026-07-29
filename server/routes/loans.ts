import { Router } from "express";
import { loanCreateSchema, loanReturnSchema } from "../../lib/types/loan";
import {
  listLoans,
  getLoan,
  deleteLoan,
  listLoansByCopy,
  distinctBorrowerNames,
} from "../../services/loans/repository";
import {
  createLoan,
  returnLoan,
  ReferenceNotFoundError,
  CopyAlreadyOnLoanError,
} from "../../services/loans/service";
import { requireAuth } from "../middleware/require-auth";
import { respondInternal } from "../lib/errors";

/**
 * Loan API (#39, server-mediated — ADR-0009). Reads are public; writes require a
 * valid session (ADR-0006). Lending validates the copy and enforces one open loan
 * per copy (design D3); the borrower is free text (never a reader).
 */
const router = Router();

router.get("/loans", async (req, res) => {
  try {
    res.json(await listLoans());
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/copies/:copyId/loans", async (req, res) => {
  try {
    res.json(await listLoansByCopy(req.params.copyId as string));
  } catch (err) {
    respondInternal(res, req, err);
  }
});

/** Distinct borrower names for the lend-form autocomplete (design D2). */
router.get("/borrowers", async (req, res) => {
  try {
    res.json(await distinctBorrowerNames());
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.get("/loans/:id", async (req, res) => {
  try {
    const loan = await getLoan(req.params.id);
    if (!loan) return res.status(404).json({ error: "not found" });
    res.json(loan);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.post("/loans", requireAuth, async (req, res) => {
  const parsed = loanCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    res.status(201).json(await createLoan(parsed.data));
  } catch (err) {
    if (err instanceof CopyAlreadyOnLoanError) {
      return res.status(409).json({ error: "copy already on loan" });
    }
    if (err instanceof ReferenceNotFoundError) {
      return res.status(400).json({ error: `unknown ${err.field}` });
    }
    respondInternal(res, req, err);
  }
});

router.post("/loans/:id/return", requireAuth, async (req, res) => {
  const parsed = loanReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "validation", details: parsed.error.flatten() });
  }
  try {
    const loan = await returnLoan(
      req.params.id as string,
      parsed.data.returnedAt,
    );
    if (!loan) return res.status(404).json({ error: "not found" });
    res.json(loan);
  } catch (err) {
    respondInternal(res, req, err);
  }
});

router.delete("/loans/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await deleteLoan(req.params.id as string);
    if (!deleted) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    respondInternal(res, req, err);
  }
});

export default router;

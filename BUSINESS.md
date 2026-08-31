# BUSINESS.md

completeness_level: complete

## Problem
The ecosystem needs a reliable Heureka marketplace feed that stays synchronized with the catalog and warehouse state without allowing out-of-date or invalid product data into the public feed.

## Target users and stakeholders
- Catalog and product teams maintaining feed quality
- Warehouse operations responsible for stock accuracy
- Marketplace operations using Heureka.cz/sk publication and readiness checks
- Platform operators monitoring feed health and dependency integrity

## Value proposition
The service turns the project’s catalog and stock truth into a valid Heureka XML feed, while exposing product readiness and order ingestion APIs so that the marketplace relationship can be managed without manual feed maintenance.

## Goals
- Generate a valid Heureka XML feed from the current catalog and stock state.
- Regenerate automatically when warehouse stock changes affect product inclusion.
- Expose a feed status and product readiness model so operators can review inclusions and exclusions.
- Support workflow continuity with order ingestion and feed monitoring.

## Non-goals
- Owning the product catalog source of truth
- Managing direct payment or billing flows for the marketplace
- Running a general-purpose e-commerce platform outside the feed integration scope
- Creating a custom user-notification channel for the service

## Success metrics
- The generated XML feed remains valid against the Heureka schema.
- Zero-stock products are excluded from the feed.
- Feed generation completes within 60 seconds for the active product set.
- Stock updates trigger feed regeneration without manual intervention.

## Business constraints
- Feed generation must always remain valid XML per the Heureka schema.
- Products with zero stock must not appear in the feed.
- The service must stay aligned with catalog and warehouse truth rather than inventing a separate product state.
- The feed boundary remains operationally focused on marketplace publication, not broader commerce ownership.

## Approval
Status: approved
Approved by: project owner
Approval evidence: owner-confirmation: heureka-onboarding-approved

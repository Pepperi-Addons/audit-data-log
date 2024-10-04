# Audit Data Log Architecture

## Overview

Audit Data Log is composed of both server-side and client-side components. 
The server-side is responsible for read and write operations to elastic:
- Get sync data from elastic- calculating sync and internal sync usage (afterwards being used by health monitor).
- Compute number of transcations and activities on different devices and users (used by usage monitor).

On the client side, a user interface (UI) is provided to enable Admin users to monitor elastic search logs based on various filters (including addons and users). Note that table key is the ActionUUID, and the ObjectID is the object the action was performed on.

---

## Relations

- usage monitor - for displaying transactions and activities statistics (based on users and device partition).

---

## PNS Usage

Audit data log use PNS for subscription to data changes (nucleus and adal).

---

## Topics

### Audit Data Log Block
#### High Level
Designed to enable users to show audit data log block, from any addon.
Addon wants to use the block, required to provide AddonUUID, ObjectKey and Resource.

#### Key Classes:
- `AuditDataLogBlockComponent` - a component which handles the block requests.

---

### Transactions and Activities Relation
#### High Level
Usage Monitor relation, designed to monitor Activities / Transactions / Packages made on the last week, by User / Buyer, using one of Android / iPad / iPhone / Web.
Hence we will have a result table with 24 rows for each combination above.
Relation function is executed on an async manner.
Note there's a comprehensive flow explanantion on each class function.

#### Key Classes:
- `CPAPIUsage` - calculate each combination usage. Calling elastic to get relevant execution logs according to Transaction or Activity, then according to the results calculate device and user usage.

- `ActivitiesCount` - inner implementation class for getting resources data (device and user type).

---

### Sync Logs
#### High Level
For Health Monitor UI internal use.
Responsible for creating sync statistics and data aggregation, retrieving data from elastic logs.
Calculated data is- Internal Sync, Sync, Sync KPIs and UI utilities.

#### Key Classes:
- `BaseElasticSyncService` - Responsible for calling to elastic (callElasticSearchLambda), validating health monitor UUID, and creating elastic basic queries (like queries for calculating dist and global maintenance hours).

- `InternalSyncService` - Extending BaseElasticSyncService. Responsible for getting all internal syncs over a specific period, according to the given filters.

- `SyncJobsService` - Extending BaseElasticSyncService. Responsible for getting all syncs over a specific period, according to the given filters.

- `SyncDataAggregations` - Extending BaseSyncAggregationService. Responsible for counting how many syncs were performed hourly, daily weekly and monthly, according to their status (Success or Failure, and Delayed for Number of Tries greater than a given value, in our case 12).

- `UptimeSyncService` - Extending BaseKPIService. Responsible for calculating uptime sync over the current and the last month.

---

### Audit Data Log UI functions
#### High Level

Audit Data Log UI, shows logs table and enable the user to filter by Addon, Resource, User, action type and action date time.
Note that table ID represent ActionUUID.

#### Key Components:
- `AuditDataLogComponent`- Audit Data Log UI component. Note only Admins have permission using the UI.

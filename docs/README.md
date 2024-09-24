# Audit Data Log

## High Level
Audit Data Log addon is designed to get and update elastic search logs.
It expose a UI for Admins for monitoring elastic logs based on various filters, including user and addon, which enable user to monitor performed executions.
Furthermore, audit data log expose a block for other addons inner use (to display audit logs for a specific key).

---

## Releases
| Version | Description | Migration |
|-------- |------------ |---------- |
| 1.2     | Bugs fixes | - |
| 1.1     | UI Permissions for Admins, add sync statistics data, bugs fixes | - |
| 1.0     | Audit Data Log UI, using PNS, add transaction and activities relation function  | - |

---

## Deployment

After a PR is merged into a release branch, an available version will be published.

---

## Debugging

Use the postman localhost folder to debug Health Monitor functions locally.
In order to debug callElasticSearchLambda related functions, you'll need to perform the above steps:
- Create an AWS Credentials file, named credentials, in a folder named .aws in your home directory. 
- Configure AWS requested environment Access Keys (choose option 2, delete the first line of role and instead choose default).
- credentials should be on the following format:
  [default]
  aws_access_key_id:ACCESS_KEY_ID
  aws_secret_access_key:SECRET_ACCESS_KEY
  aws_session_token:SESSION_TOKEN
  
- After saving the file, you can debug callElasticSearchLambda related functions. Note that you'll need to update the file in case the credenetials expires.

### Online specific
- Log groups: 
  - `/aws/lambda/ExecuteAddonSync` - own logs for short running sync jobs: all sync related data aggregated from elastic found on this log group.
  - `/aws/lambda/AsyncTaskExecutionLambda` - own logs for long running async jobs: transactions_and_activities_data relation function executed running on an async relation mode, hence running on AsyncTaskExecutionLambda lambda.


---

## Testing

There are no tests included within the Health Monitor addon itself, and all tests are handled by the QA team.

---

## Dependencies

| Addon | Usage |
|-------- |------------ |
| pns | for subscribing data changes on nucleus and adal |
| pepperi_elastic_search |  |
| kms | Used for saving maintenance window |

---

## APIs
[Postman Collection](./audit-data-log.postman_collection.json)

---

## Architecture
see: [Architecture](./architecture.md)

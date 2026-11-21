# Deployment cleanup

FR-001: After readiness succeeds, remove this service's stopped rollback containers and superseded image references. FR-002: Preserve rollback on failure, active containers/images, runtime configuration, volumes and other services. FR-003: Bound unused build cache and remove generated transfer/build files.

AC-001: Successful replacement cleans obsolete service resources. AC-002: Failed readiness never invokes cleanup. AC-003: Cleanup failures report failure without rolling back the healthy replacement.

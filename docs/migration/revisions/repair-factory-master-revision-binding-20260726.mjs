import { readFile, writeFile } from 'node:fs/promises';

import {
  canonicalizeTodoArtifact,
  todoSelfDigest,
} from '../../../../Lattice/src/todo-contracts.mjs';

const manifestRef = '.lattice/todo/manifest.json';
const planRef = '.lattice/todo/plans/factory-master/rev-af4008cfac983837ddad6fb3/plan.json';
const revisionRef = '.lattice/todo/plans/factory-master/rev-af4008cfac983837ddad6fb3/revision.json';
const manifest = JSON.parse(await readFile(manifestRef, 'utf8'));
const plan = JSON.parse(await readFile(planRef, 'utf8'));
const revision = JSON.parse(await readFile(revisionRef, 'utf8'));
const descriptor = manifest.members.find(({ plan_key: planKey }) => planKey === 'factory-master');

if (manifest.schema !== 'lattice.todo_manifest.v2'
  || descriptor?.active_plan_version !== plan.plan_version
  || descriptor.plan_ref !== planRef
  || revision.desired_plan.plan_digest !== plan.plan_digest
  || descriptor.active_revision_digest
    !== 'b790889fd3c8ccac9983fe4462dea95c58a2cf382cb44ac28b7b1f25c821507a') {
  throw new Error('repair precondition mismatch');
}

descriptor.active_revision_digest = revision.revision_digest;
manifest.manifest_digest = todoSelfDigest(manifest, 'manifest_digest');
await writeFile(manifestRef, `${canonicalizeTodoArtifact(manifest)}\n`);

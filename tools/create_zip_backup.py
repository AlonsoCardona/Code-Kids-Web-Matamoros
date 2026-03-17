#!/usr/bin/env python3
import zipfile, os, time

def create_zip(dst_folder='dev_artifacts_removed'):
    t = time.strftime('%Y%m%d-%H%M%S')
    dest = os.path.join(dst_folder, f'CodeKidsv1All-main-backup-{t}.zip')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with zipfile.ZipFile(dest, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk('.'):
            # skip virtual envs, git meta, cache
            parts = root.split(os.sep)
            if '.git' in parts or '__pycache__' in parts:
                continue
            for f in files:
                fp = os.path.join(root, f)
                # skip the zip we're creating
                if os.path.abspath(fp) == os.path.abspath(dest):
                    continue
                # skip common system files
                if f.lower() in ('thumbs.db', 'desktop.ini'):
                    continue
                try:
                    arcname = os.path.relpath(fp, '.')
                    z.write(fp, arcname)
                except Exception as e:
                    print('SKIP:'+fp+':'+str(e))
    return dest

if __name__ == '__main__':
    dest = create_zip()
    print('ZIP_CREATED:'+dest)

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Pro export: writes the file to the app's cache and opens Android's share sheet, so the user chooses where it goes
 * (Drive, email, Files). Nothing is uploaded by the app itself.
 */
export async function shareText(filename: string, text: string, mimeType: string): Promise<boolean> {
  try {
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    await file.write(text);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
    return true;
  } catch {
    return false;
  }
}

/** Opens the file picker and returns the text of the chosen file (backup restore), or null. */
export async function pickText(): Promise<string | null> {
  try {
    const r = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
    if (r.canceled || !r.result) return null;
    const f = r.result;
    if (f.size > 2_000_000) return null;
    return await f.text();
  } catch {
    return null;
  }
}

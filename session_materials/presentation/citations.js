/**
 * Lightweight citation system for Reveal.js presentations
 *
 * Usage:
 *   <cite key="smith2020">Smith et al., 2020</cite>
 *   or
 *   <cite key="smith2020"></cite>  (auto-fills with "Authors, Year")
 *
 * The script will:
 *   1. Link citations to their DOIs
 *   2. Generate a bibliography in the element with id="bibliography"
 *   3. Validate all citation keys exist in references.json
 */

(function() {
  'use strict';

  let references = {};
  const citedKeys = new Set();
  const missingKeys = new Set();

  // Format a short citation (Author, Year) from reference data
  function formatShortCite(ref) {
    const authors = ref.authors;
    let shortAuthors;

    // Check for explicit "..." indicating many authors
    if (authors.includes('...')) {
      shortAuthors = authors.split(',')[0] + ' et al.';
    } else {
      // Count authors: each "., " before ampersand indicates an author boundary
      // "Smith, A., & Jones, B." → 2 authors
      // "Smith, A., Jones, B., & Brown, C." → 3 authors
      const hasAmpersand = authors.includes(' & ');
      const preAmpersand = hasAmpersand ? authors.split(' & ')[0] : authors;
      const separatorCount = (preAmpersand.match(/\., /g) || []).length;
      const authorCount = separatorCount + (hasAmpersand ? 2 : 1);

      if (authorCount > 2) {
        // 3+ authors: "Smith et al."
        shortAuthors = authors.split(',')[0] + ' et al.';
      } else if (hasAmpersand) {
        // Two authors: "Smith & Jones"
        const parts = authors.split(' & ');
        const first = parts[0].split(',')[0];
        const second = parts[1].split(',')[0];
        shortAuthors = `${first} & ${second}`;
      } else {
        // Single author
        shortAuthors = authors.split(',')[0];
      }
    }

    return `${shortAuthors} (${ref.year})`;
  }

  // Format a full bibliography entry
  function formatBibEntry(key, ref) {
    let entry = `${ref.authors} (${ref.year}). ${ref.title}. <em>${ref.journal}</em>`;

    if (ref.volume) {
      entry += `, <em>${ref.volume}</em>`;
      if (ref.issue) {
        entry += `(${ref.issue})`;
      }
    }

    if (ref.pages) {
      entry += `, ${ref.pages}`;
    }

    entry += '.';

    if (ref.doi) {
      entry += ` <a href="https://doi.org/${ref.doi}" target="_blank">doi:${ref.doi}</a>`;
    }

    return entry;
  }

  // Process all citation elements
  function processCitations() {
    const cites = document.querySelectorAll('cite[key]');

    cites.forEach(cite => {
      const key = cite.getAttribute('key');

      if (!references[key]) {
        missingKeys.add(key);
        cite.style.color = 'red';
        cite.style.fontWeight = 'bold';
        cite.title = `Missing reference: ${key}`;
        if (!cite.textContent.trim()) {
          cite.textContent = `[MISSING: ${key}]`;
        }
        return;
      }

      citedKeys.add(key);
      const ref = references[key];

      // If no text content, auto-fill with short citation
      if (!cite.textContent.trim()) {
        cite.textContent = formatShortCite(ref);
      } else {
        // Normalise "Name, Year" to "Name (Year)" in explicit text
        cite.textContent = cite.textContent.replace(/,\s*(\d{4})\b/, ' ($1)');
      }

      // Wrap in link to DOI
      if (ref.doi) {
        const link = document.createElement('a');
        link.href = `https://doi.org/${ref.doi}`;
        link.textContent = cite.textContent;
        link.target = '_blank';
        cite.textContent = '';
        cite.appendChild(link);
      }
    });
  }

  // Generate bibliography with pagination across slides
  function generateBibliography() {
    const bibElement = document.getElementById('bibliography');
    if (!bibElement) return;

    if (citedKeys.size === 0) {
      bibElement.innerHTML = '<p><em>No citations found.</em></p>';
      return;
    }

    // Sort by author surname, then year
    const sortedKeys = Array.from(citedKeys).sort((a, b) => {
      const refA = references[a];
      const refB = references[b];
      const authorA = refA.authors.split(',')[0].toLowerCase();
      const authorB = refB.authors.split(',')[0].toLowerCase();
      if (authorA !== authorB) return authorA.localeCompare(authorB);
      return refA.year - refB.year;
    });

    const REFS_PER_PAGE = 8;
    const totalPages = Math.ceil(sortedKeys.length / REFS_PER_PAGE);

    // Get the parent section element
    const parentSection = bibElement.closest('section');
    let lastInsertedSection = parentSection;

    for (let page = 0; page < totalPages; page++) {
      const startIdx = page * REFS_PER_PAGE;
      const endIdx = Math.min(startIdx + REFS_PER_PAGE, sortedKeys.length);
      const pageKeys = sortedKeys.slice(startIdx, endIdx);

      const ul = document.createElement('ul');
      ul.style.fontSize = '0.6em';
      ul.style.lineHeight = '1.5';
      ul.style.listStyleType = 'none';
      ul.style.paddingLeft = '0';

      pageKeys.forEach(key => {
        const li = document.createElement('li');
        li.style.marginBottom = '0.4em';
        li.innerHTML = formatBibEntry(key, references[key]);
        ul.appendChild(li);
      });

      if (page === 0) {
        // First page goes in the existing bibliography element
        bibElement.appendChild(ul);
      } else {
        // Create new slides for subsequent pages, inserting after the last one
        const newSection = document.createElement('section');
        const heading = document.createElement('h2');
        heading.textContent = `References (continued)`;
        newSection.appendChild(heading);
        newSection.appendChild(ul);
        lastInsertedSection.parentNode.insertBefore(newSection, lastInsertedSection.nextSibling);
        lastInsertedSection = newSection;
      }
    }
  }

  // Report validation results to console
  function reportValidation() {
    console.log(`Citations: ${citedKeys.size} used, ${Object.keys(references).length} in references.json`);

    if (missingKeys.size > 0) {
      console.error('MISSING REFERENCES:', Array.from(missingKeys));
    }

    // Check for unused references
    const unusedKeys = Object.keys(references).filter(k => !citedKeys.has(k));
    if (unusedKeys.length > 0) {
      console.warn('Unused references:', unusedKeys);
    }
  }

  // Initialize
  async function init() {
    try {
      const response = await fetch('references.json');
      if (!response.ok) {
        throw new Error(`Failed to load references.json: ${response.status}`);
      }
      references = await response.json();

      processCitations();
      generateBibliography();
      reportValidation();

    } catch (error) {
      console.error('Citation system error:', error);
      // Mark all citations as failed
      document.querySelectorAll('cite[key]').forEach(cite => {
        cite.style.color = 'orange';
        cite.title = 'Failed to load references';
      });
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

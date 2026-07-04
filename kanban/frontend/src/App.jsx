import React, { useState, useEffect } from 'react';
import { apiFetch } from "./lib/api";
export default function App() {
    const [boards, setBoards] = useState([]);
    const [activeBoardId, setActiveBoardId] = useState(null);
    const [boardDetails, setBoardDetails] = useState(null);
    const [members, setMembers] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [editingCard, setEditingCard] = useState(null);
    const [showBoardModal, setShowBoardModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);

    // Form inputs
    const [newBoard, setNewBoard] = useState({ name: '', description: '' });
    const [newMember, setNewMember] = useState({ name: '', email: '' });
    const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
    const [newListNames, setNewListNames] = useState({}); // board_id -> list name input
    const [newCardTitles, setNewCardTitles] = useState({}); // list_id -> card title input

    // Drag and Drop States
    const [draggedCardId, setDraggedCardId] = useState(null);

    // Initial Load
    useEffect(() => {
        fetchBoards();
        fetchMembers();
        fetchTags();
    }, []);

    // Load active board details
    useEffect(() => {
        if (activeBoardId) {
            fetchBoardDetails(activeBoardId);
        } else {
            setBoardDetails(null);
        }
    }, [activeBoardId]);

    const fetchBoards = async () => {
        try {
            const res = await apiFetch('/api/boards');
            const data = await res.json();
            setBoards(data);
            setLoading(false);
        } catch (e) {
            console.error('Error fetching boards:', e);
        }
    };

    const fetchBoardDetails = async (id) => {
        try {
            const res = await apiFetch(`/api/boards/${id}`);
            const data = await res.json();
            setBoardDetails(data);
        } catch (e) {
            console.error('Error fetching board details:', e);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await apiFetch('/api/members');
            const data = await res.json();
            setMembers(data);
        } catch (e) {
            console.error('Error fetching members:', e);
        }
    };

    const fetchTags = async () => {
        try {
            const res = await apiFetch('/api/tags');
            const data = await res.json();
            setTags(data);
        } catch (e) {
            console.error('Error fetching tags:', e);
        }
    };

    // Board actions
    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoard.name.trim()) return;
        try {
            const res = await apiFetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBoard)
            });
            const data = await res.json();
            setBoards([...boards, { ...data, lists_count: 3 }]);
            setActiveBoardId(data.id);
            setNewBoard({ name: '', description: '' });
            setShowBoardModal(false);
        } catch (e) {
            console.error('Error creating board:', e);
        }
    };

    const handleAddBoardMember = async (memberId) => {
        if (!boardDetails) return;
        try {
            const res = await apiFetch(`/api/boards/${boardDetails.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: memberId })
            });
            const data = await res.json();
            setBoardDetails(data);
        } catch (e) {
            console.error('Error adding member:', e);
        }
    };

    // List actions
    const handleCreateList = async (boardId) => {
        const name = newListNames[boardId];
        if (!name || !name.trim()) return;
        try {
            const res = await apiFetch('/api/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ board_id: boardId, name })
            });
            const data = await res.json();
            setBoardDetails({
                ...boardDetails,
                lists: [...boardDetails.lists, data]
            });
            setNewListNames({ ...newListNames, [boardId]: '' });
        } catch (e) {
            console.error('Error creating list:', e);
        }
    };

    const handleDeleteList = async (listId) => {
        if (!confirm('Are you sure you want to delete this list? All cards in it will be lost.')) return;
        try {
            await apiFetch(`/api/lists/${listId}`, { method: 'DELETE' });
            setBoardDetails({
                ...boardDetails,
                lists: boardDetails.lists.filter(l => l.id !== listId)
            });
        } catch (e) {
            console.error('Error deleting list:', e);
        }
    };

    // Card actions
    const handleCreateCard = async (listId) => {
        const title = newCardTitles[listId];
        if (!title || !title.trim()) return;
        try {
            const res = await apiFetch('/api/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ board_list_id: listId, title })
            });
            const data = await res.json();

            // Insert into the UI state
            const updatedLists = boardDetails.lists.map(list => {
                if (list.id === listId) {
                    return { ...list, cards: [...list.cards, data] };
                }
                return list;
            });
            setBoardDetails({ ...boardDetails, lists: updatedLists });
            setNewCardTitles({ ...newCardTitles, [listId]: '' });
        } catch (e) {
            console.error('Error creating card:', e);
        }
    };

    const handleUpdateCardDetails = async (cardId, fields) => {
        try {
            const res = await apiFetch(`/api/cards/${cardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
            });
            const data = await res.json();

            // Refresh board details
            fetchBoardDetails(boardDetails.id);
            setEditingCard(data);
        } catch (e) {
            console.error('Error updating card:', e);
        }
    };

    const handleDeleteCard = async (cardId) => {

        if (!confirm('Delete this card?')) return;
        try {
            await apiFetch(`/api/cards/${cardId}`, { method: 'DELETE' });
            setBoardDetails({
                ...boardDetails,
                lists: boardDetails.lists.map(l => ({
                    ...l,
                    cards: l.cards.filter(c => c.id !== cardId)
                }))
            });
            setEditingCard(null);
        } catch (e) {
            console.error('Error deleting card:', e);
        }
    };

    // Member creation
    const handleCreateMember = async (e) => {
        e.preventDefault();
        if (!newMember.name.trim() || !newMember.email.trim()) return;
        try {
            const res = await apiFetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMember)
            });
            const data = await res.json();
            setMembers([...members, data]);
            setNewMember({ name: '', email: '' });
            setShowMemberModal(false);
        } catch (e) {
            console.error('Error creating member:', e);
        }
    };

    // Tag creation
    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!newTag.name.trim()) return;
        try {
            const res = await apiFetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTag)
            });
            const data = await res.json();
            setTags([...tags, data]);
            setNewTag({ name: '', color: '#3b82f6' });
            setShowTagModal(false);
        } catch (e) {
            console.error('Error creating tag:', e);
        }
    };

    // HTML5 Native Drag & Drop Handlers
    const handleDragStart = (e, cardId) => {
        setDraggedCardId(cardId);
        e.dataTransfer.setData('text/plain', cardId.toString());
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, targetListId) => {
        e.preventDefault();
        const cardId = parseInt(e.dataTransfer.getData('text/plain') || draggedCardId);
        if (!cardId) return;

        // Find the card to update UI state immediately (optimistic update)
        let foundCard = null;
        const currentLists = [...boardDetails.lists];

        // Locate card and remove it from its source list
        const updatedLists = currentLists.map(list => {
            const cardIndex = list.cards.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                foundCard = { ...list.cards[cardIndex], board_list_id: targetListId };
                const newCards = [...list.cards];
                newCards.splice(cardIndex, 1);
                return { ...list, cards: newCards };
            }
            return list;
        });

        if (!foundCard) return;

        // Add card to target list
        const finalLists = updatedLists.map(list => {
            if (list.id === targetListId) {
                const newCards = [...list.cards, foundCard];
                return { ...list, cards: newCards };
            }
            return list;
        });

        // Set state optimistically
        setBoardDetails({ ...boardDetails, lists: finalLists });

        // Persist to server
        const targetList = finalLists.find(l => l.id === targetListId);
        const newOrder = targetList ? targetList.cards.length - 1 : 0;

        try {
            await apiFetch('/api/cards/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_id: cardId,
                    board_list_id: targetListId,
                    order: newOrder
                })
            });
            // Fetch fresh state to sync orders perfectly
            fetchBoardDetails(boardDetails.id);
        } catch (e) {
            console.error('Error saving reorder state:', e);
        }

        setDraggedCardId(null);
    };

    // Overdue Helper
    const isOverdue = (dateStr) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        return date < now;
    };

    const formatDueDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header Dashboard Nav */}
            <header className="navbar flex justify-between items-center px-6 py-4 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <span className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                        ClawBoard 🦀
                    </span>
                    {activeBoardId && (
                        <button
                            onClick={() => setActiveBoardId(null)}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors text-slate-300"
                        >
                            ← Back to Boards
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMemberModal(true)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded font-semibold transition-transform hover:scale-105"
                    >
                        + Add Member
                    </button>
                    <button
                        onClick={() => setShowTagModal(true)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded font-semibold transition-transform hover:scale-105"
                    >
                        + Add Tag
                    </button>
                </div>
            </header>

            {/* Main Workspace Area */}
            <main className="flex-1 p-6 overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
                    </div>
                ) : !activeBoardId ? (
                    /* Boards List View */
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-semibold mb-6 text-slate-200">Your Boards</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {boards.map(board => (
                                <div
                                    key={board.id}
                                    onClick={() => setActiveBoardId(board.id)}
                                    className="board-card bg-slate-800 hover:bg-slate-750 p-6 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer transition-all shadow-md group"
                                >
                                    <h3 className="text-lg font-bold group-hover:text-indigo-300 transition-colors">
                                        {board.name}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-2 h-12 overflow-hidden text-ellipsis line-clamp-2">
                                        {board.description || 'No description provided.'}
                                    </p>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
                                        <span>{board.lists_count || 0} lists</span>
                                        <span className="text-indigo-400 group-hover:underline">Open Board →</span>
                                    </div>
                                </div>
                            ))}
                            {/* Create Board Button Card */}
                            <div
                                onClick={() => setShowBoardModal(true)}
                                className="board-card flex flex-col justify-center items-center p-6 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 cursor-pointer hover:bg-slate-800/40 transition-all min-h-[160px]"
                            >
                                <span className="text-3xl text-slate-500">+</span>
                                <span className="text-sm font-semibold text-slate-400 mt-2">Create New Board</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Active Board Details Kanban View */
                    boardDetails && (
                        <div className="h-full flex flex-col">
                            {/* Board Header Details */}
                            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-100">{boardDetails.name}</h2>
                                    <p className="text-sm text-slate-400 max-w-2xl">{boardDetails.description}</p>
                                </div>
                                {/* Board Assignees List */}
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {boardDetails.members && boardDetails.members.map(m => (
                                            <div
                                                key={m.id}
                                                title={`${m.name} (${m.email})`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white text-xs font-bold border-2 border-slate-900 shadow"
                                            >
                                                {m.name.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) handleAddBoardMember(e.target.value);
                                            e.target.value = '';
                                        }}
                                        className="text-xs bg-slate-800 text-slate-200 border border-slate-700 px-2 py-1.5 rounded"
                                    >
                                        <option value="">+ Invite Member</option>
                                        {members
                                            .filter(m => !boardDetails.members?.some(bm => bm.id === m.id))
                                            .map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            {/* Kanban Grid Container */}
                            <div className="flex gap-6 items-start">
                                {boardDetails.lists && boardDetails.lists.map(list => (
                                    <div
                                        key={list.id}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, list.id)}
                                        className="kanban-column bg-slate-850/80 backdrop-blur w-72 shrink-0 p-4 rounded-lg border border-slate-800 flex flex-col max-h-[75vh]"
                                    >
                                        {/* Column Header */}
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-slate-200 text-sm tracking-wide uppercase">
                                                {list.name}
                                            </h4>
                                            <button
                                                onClick={() => handleDeleteList(list.id)}
                                                className="text-slate-500 hover:text-rose-400 text-xs transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Column Cards Wrapper */}
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh]">
                                            {list.cards && list.cards.map(card => (
                                                <div
                                                    key={card.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, card.id)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => setEditingCard(card)}
                                                    className="kanban-card bg-slate-800 hover:bg-slate-750 p-4 rounded border border-slate-700 hover:border-slate-500 cursor-grab active:cursor-grabbing transition-all shadow-sm relative group"
                                                >
                                                    {/* Card Tags */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {card.tags && card.tags.map(t => (
                                                            <span
                                                                key={t.id}
                                                                className="text-[10px] px-2 py-0.5 rounded font-bold uppercase text-white tracking-wider"
                                                                style={{ backgroundColor: t.color }}
                                                            >
                                                                {t.name}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <h5 className="font-semibold text-sm text-slate-100 mb-2">
                                                        {card.title}
                                                    </h5>

                                                    {/* Card Meta footer */}
                                                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-700/50 text-[11px] text-slate-400">
                                                        {/* Due Date Indicator */}
                                                        {card.due_date ? (
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                                                    isOverdue(card.due_date)
                                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                                        : 'bg-slate-700 text-slate-300'
                                                                }`}
                                                            >
                                                                📅 {formatDueDate(card.due_date)}
                                                                {isOverdue(card.due_date) && ' (Overdue)'}
                                                            </span>
                                                        ) : (
                                                            <span></span>
                                                        )}

                                                        {/* Assignee Badge */}
                                                        {card.member ? (
                                                            <div
                                                                title={`Assigned to ${card.member.name}`}
                                                                className="w-5.5 h-5.5 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]"
                                                            >
                                                                {card.member.name.charAt(0)}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {list.cards?.length === 0 && (
                                                <div className="text-center text-xs text-slate-500 py-6 border border-dashed border-slate-800 rounded">
                                                    Drop cards here
                                                </div>
                                            )}
                                        </div>

                                        {/* Column Quick Add Card */}
                                        <div className="mt-4 pt-3 border-t border-slate-800/80">
                                            <input
                                                type="text"
                                                placeholder="+ Add card..."
                                                value={newCardTitles[list.id] || ''}
                                                onChange={(e) => setNewCardTitles({ ...newCardTitles, [list.id]: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCard(list.id); }}
                                                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* Add New List Input Column */}
                                <div className="kanban-column bg-slate-850/30 w-72 shrink-0 p-4 rounded-lg border border-dashed border-slate-800 flex flex-col">
                                    <input
                                        type="text"
                                        placeholder="+ Add new list column..."
                                        value={newListNames[boardDetails.id] || ''}
                                        onChange={(e) => setNewListNames({ ...newListNames, [boardDetails.id]: e.target.value })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(boardDetails.id); }}
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={() => handleCreateList(boardDetails.id)}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-1.5 rounded mt-2 transition-colors"
                                    >
                                        Create List
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </main>

            {/* Modal: Create Board */}
            {showBoardModal && (
                <div className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="modal-content bg-slate-850 border border-slate-700 w-full max-w-md p-6 rounded-lg shadow-xl relative animate-fade-in">
                        <button
                            onClick={() => setShowBoardModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold text-slate-100 mb-4">Create New Board</h3>
                        <form onSubmit={handleCreateBoard} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Board Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newBoard.name}
                                    onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="Engineering Sprint, Vacation Planner..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Description (Optional)</label>
                                <textarea
                                    value={newBoard.description}
                                    onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 h-24 resize-none"
                                    placeholder="Explain the purpose of this board..."
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded text-sm transition-transform hover:scale-102"
                            >
                                Create Board
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Global Member */}
            {showMemberModal && (
                <div className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="modal-content bg-slate-850 border border-slate-700 w-full max-w-md p-6 rounded-lg shadow-xl relative">
                        <button
                            onClick={() => setShowMemberModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold text-slate-100 mb-4">Add Global Member</h3>
                        <form onSubmit={handleCreateMember} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded text-sm transition-colors"
                            >
                                Add Member
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Global Tag */}
            {showTagModal && (
                <div className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="modal-content bg-slate-850 border border-slate-700 w-full max-w-md p-6 rounded-lg shadow-xl relative">
                        <button
                            onClick={() => setShowTagModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold text-slate-100 mb-4">Create Global Label Tag</h3>
                        <form onSubmit={handleCreateTag} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tag Label Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newTag.name}
                                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                                    placeholder="Bug, Design, Optimization..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Label Tag Color</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={newTag.color}
                                        onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                                        className="w-12 h-10 bg-transparent border-0 cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-400 font-mono">{newTag.color}</span>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded text-sm transition-colors"
                            >
                                Add Label Tag
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Card Details & Editing */}
            {editingCard && (
                <div className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="modal-content bg-slate-850 border border-slate-700 w-full max-w-xl p-6 rounded-lg shadow-xl relative animate-scale-up">
                        <button
                            onClick={() => setEditingCard(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
                        >
                            ✕
                        </button>

                        <div className="mb-4">
                            <input
                                type="text"
                                className="w-full bg-transparent border-0 font-bold text-xl text-slate-100 focus:outline-none focus:bg-slate-900 px-2 py-1 rounded"
                                defaultValue={editingCard.title}
                                onBlur={(e) => {
                                    if (e.target.value.trim() && e.target.value !== editingCard.title) {
                                        handleUpdateCardDetails(editingCard.id, { title: e.target.value });
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card Edit Form Fields */}
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Description</label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 h-32 resize-none"
                                        placeholder="Add a detailed description..."
                                        defaultValue={editingCard.description || ''}
                                        onBlur={(e) => {
                                            if (e.target.value !== (editingCard.description || '')) {
                                                handleUpdateCardDetails(editingCard.id, { description: e.target.value });
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Sidebar Options */}
                            <div className="space-y-4 border-l border-slate-700/50 pl-0 md:pl-4">
                                {/* Assignee Select */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Assignee</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded text-xs px-2.5 py-1.5 text-slate-200"
                                        value={editingCard.member_id || ''}
                                        onChange={(e) => {
                                            const val = e.target.value ? parseInt(e.target.value) : null;
                                            handleUpdateCardDetails(editingCard.id, { member_id: val });
                                        }}
                                    >
                                        <option value="">Unassigned</option>
                                        {boardDetails.members && boardDetails.members.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Due Date Input */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded text-xs px-2.5 py-1.5 text-slate-200 focus:outline-none"
                                        value={editingCard.due_date ? editingCard.due_date.substring(0, 10) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value ? e.target.value + ' 12:00:00' : null;
                                            handleUpdateCardDetails(editingCard.id, { due_date: val });
                                        }}
                                    />
                                </div>

                                {/* Tags Picker */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Labels/Tags</label>
                                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto border border-slate-800 p-2 rounded bg-slate-900/50">
                                        {tags.map(tag => {
                                            const isAttached = editingCard.tags?.some(t => t.id === tag.id);
                                            return (
                                                <label key={tag.id} className="flex items-center gap-2 cursor-pointer text-xs">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAttached}
                                                        onChange={() => {
                                                            const currentTagIds = editingCard.tags?.map(t => t.id) || [];
                                                            let newTagIds;
                                                            if (isAttached) {
                                                                newTagIds = currentTagIds.filter(id => id !== tag.id);
                                                            } else {
                                                                newTagIds = [...currentTagIds, tag.id];
                                                            }
                                                            handleUpdateCardDetails(editingCard.id, { tags: newTagIds });
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-700"
                                                    />
                                                    <span
                                                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider block flex-1"
                                                        style={{ backgroundColor: tag.color }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700/50">
                                    <button
                                        onClick={() => handleDeleteCard(editingCard.id)}
                                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-1.5 rounded text-xs transition-colors"
                                    >
                                        Delete Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
